import {BaseScript, NSObject} from "./baseScript.js";
import {BankMessaging} from "./messaging.js";

const BANK_INFO_FILE = "bank-info.txt";

export class BankScript extends BaseScript {
  constructor(ns, doEventLoop = true) {
    super(ns);
    this.doEventLoop = doEventLoop;
  }

  async perform() {
    this.setup();
    this.messaging = new BankMessaging(this.ns);
    if (this.args[0] === "clear") {
      this.initializeState();
    }

    if (this.doEventLoop) await this.eventLoop();
  }

  async eventLoop() {
    let handle = this.messaging.requestHandle();
    while (true) {
      this.update();

      while (handle.data.length > 0) {
        let message = handle.data.shift();
        try {
          this.handleRequest(message);
        } catch (e) {
          this.tlog(`Error handling bank message: ${e.message}`);
        }
      }

      this.saveState();
      await this.ns.sleep(100);
    }
  }

  clone(data) {
    return JSON.parse(JSON.stringify(data));
  }

  handleRequest(req) {
    this.log(`Responding to request: ${JSON.stringify(req)}`);
    const type = req.data.type;
    if (type === BankMessaging.WALLET_INFO) {
      let name = req.data.wallet;
      return this.messaging.sendResponse(req, this.clone(this.wallet(name)));
    } else if (type === BankMessaging.PURCHASE_SERVER) {
      return this.purchaseServer(req);
    } else if (type === BankMessaging.PURCHASE_EQUIPMENT) {
      return this.purchaseEquipment(req);
    } else if (type === BankMessaging.DEPOSIT) {
      this.deposit(req);
    } else if (type === BankMessaging.SET_BALANCES) {
      return this.setBalances(req);
    } else if (type === BankMessaging.ALL_WALLETS) {
      return this.allWalletsInfo(req);
    } else if (type === BankMessaging.CLEAR) {
      this.initializeState();
      return this.messaging.sendResponse(req, {success: true});
    } else {
      this.tlog(`Bank received unknown message type: ${type}`);
    }
  }

  allWalletsInfo(req) {
    let wallets = [...this.wallets];

    // let total = this.walletTotal();
    // let remainder = this.actualMoney() - total;
    // let portionSum = wallets.reduce((sum, e) => sum + e.portion, 0);
    // let remainderPortion = Math.floor((1 - portionSum) * 100) / 100;
    // wallets.push({name: "free", amount: remainder, portion: remainderPortion});

    return this.messaging.sendResponse(req, {wallets: wallets});
  }

  purchaseServer(req) {
    let wallet = this.wallet(req.data.wallet);
    let name = req.data.serverName;
    let ram = req.data.ram;

    let cost = this.ns.getPurchasedServerCost(ram);
    let purchased = false;
    if (cost < wallet.amount) {
      this.purchaseForWallet(
        wallet.name,
        `Buying server of size: ${ram} name: ${name}`,
        () => {
          this.ns.purchaseServer(name, ram);
        }
      );
      purchased = true;
    }

    return this.messaging.sendResponse(req, {purchased});
  }

  purchaseEquipment(req) {
    let wallet = this.wallet(req.data.wallet);
    let name = req.data.memberName;
    let equipment = req.data.equipmentName;

    let cost = this.ns.gang.getEquipmentCost(equipment);

    let purchased = false;
    if (cost < wallet.amount) {
      this.purchaseForWallet(
        wallet.name,
        `Buying ${equipment} at ${cost} for ${name}`,
        () => {
          this.ns.gang.purchaseEquipment(name, equipment);
        }
      );
      purchased = true;
      this.messaging.sendResponse(req, {purchased});
    }
  }

  setBalances(req) {
    let amountSum = this.walletTotal();
    for (let [name, amount] of req.data.sets) {
      let wallet = this.wallet(name);
      amountSum = amountSum - wallet.amount + amount;
    }

    let success = false;
    if (amountSum < this.actualMoney()) {
      success = true;

      for (let [name, amount] of req.data.sets) {
        let wallet = this.wallet(name);
        wallet.amount = amount;
      }
    }

    return this.messaging.sendResponse(req, {success});
  }

  deposit(req) {
    let wallet = this.wallet(req.data.wallet);
    let amount = req.data.amount;

    if (amount > this.unallocatedMoney()) {
      this.messaging.sendResponse(req, {success: false});
    }

    wallet.amount += amount;
    this.saveState();

    return this.messaging.sendResponse(req, {success: true});
  }

  walletTotal() {
    return this.wallets.reduce((sum, e) => e.amount + sum, 0);
  }

  unallocatedMoney() {
    let walletTotal = this.walletTotal();
    return this.actualMoney() - walletTotal;
  }

  purchaseForWallet(walletName, description, fn) {
    let currentMoney = this.actualMoney();
    this.log(`Performing Purchase: ${description}`);
    fn();
    let newMoney = this.actualMoney();

    let diff = currentMoney - newMoney;
    let wallet = this.wallet(walletName);
    this.log(`Purchase Cost for: ${description} cost: ${diff}`);
    wallet.amount -= diff;

    this.state.allocatedMoney = newMoney;
    this.saveState();
  }

  update() {
    // Check for reset
    let currentHackingLevel = this.actualHackingLevel();
    if (this.state.hackingLevel > currentHackingLevel) {
      this.tlog(`Detected reset/prestige, resetting bank`);
      this.initializeState();
    }
    this.state.hackingLevel = currentHackingLevel;

    let currentMoney = this.actualMoney();

    // Allocate diff
    let diff = currentMoney - this.state.allocatedMoney;
    this.debugLog(`Allocating ${diff} to wallets`);

    let walletsHash = this.walletsByPriority();

    if (diff > 0) {
      let priorities = Object.keys(walletsHash).sort();
      for (let priority of priorities) {
        let wallets = walletsHash[priority];

        for (let wallet of wallets) {
          if (wallet.reserve) {
            if (wallet.reserve > wallet.amount) {
              let wants = wallet.reserve - wallet.amount;
              let change = Math.min(wants, diff);
              diff -= change;
              wallet.amount += change;
            }
          }

          let diffPortion = diff * wallet.portion;
          wallet.amount += Math.floor(diffPortion);
        }
      }
    } else {
      let reversePriority = Object.keys(walletsHash)
        .sort()
        .reverse();

      for (let priority of reversePriority) {
        let wallets = walletsHash[priority];
        let total = wallets.reduce((sum, e) => sum + e.amount, 0);
        let portionTotal = wallets.reduce((sum, e) => sum + e.portion, 0);

        let forLevel = Math.min(Math.abs(diff), total);
        diff += forLevel;

        for (let wallet of wallets) {
          let portionAmount = forLevel * (wallet.portion / portionTotal);
          wallet.amount = Math.max(wallet.amount - Math.ceil(portionAmount), 0);
        }

        if (diff >= 0) break;
      }
    }

    this.state.allocatedMoney = currentMoney;
    this.saveState();
  }

  walletNames() {
    return Object.keys(this.state.wallets);
  }

  wallet(name) {
    return this.state.wallets[name];
  }

  get wallets() {
    return Object.keys(this.state.wallets).map(name => this.wallet(name));
  }

  setup() {
    this.disableLogging("sleep", "getServerMoneyAvailable", "getHackingLevel");

    if (this.ns.fileExists(BANK_INFO_FILE, "home")) {
      let contents = this.ns.read(BANK_INFO_FILE);
      this.state = JSON.parse(contents);
    }

    if (!this.state) {
      this.initializeState();
    }
  }

  debugLog(msg) {
    if (this.DEBUG) {
      this.log(msg);
    }
  }

  actualHackingLevel() {
    return this.ns.getHackingLevel();
  }

  walletsByPriority() {
    let hash = {};
    for (let wallet of this.wallets) {
      if (!(wallet.priority in hash)) {
        hash[wallet.priority] = [];
      }
      hash[wallet.priority].push(wallet);
    }

    return hash;
  }

  sortedWallets() {
    return this.wallets.sort((a, b) => a.priority - b.priority);
  }

  initializeState() {
    this.state = {
      allocatedMoney: 0,
      reserved: 0,
      hackingLevel: this.actualHackingLevel(),
      wallets: {},
    };

    // this.addWallet({name: "gang", portion: 0.3});
    this.addWallet({name: "servers", portion: 0.5});
    this.addWallet({name: "rest", portion: 0.5, priority: 6});

    this.saveState();
  }

  addWallet({name, portion = 0, priority = 5, amount = 0, reserve = 0} = {}) {
    this.state.wallets[name] = {
      name,
      portion,
      priority,
      amount,
      reserve,
    };
  }

  actualMoney() {
    return this.ns.getServerMoneyAvailable("home");
  }

  saveState() {
    this.ns.write(BANK_INFO_FILE, JSON.stringify(this.state, null, 2), "w");
  }
}

export let main = BankScript.runner();
