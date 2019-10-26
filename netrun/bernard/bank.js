import {BaseScript, NSObject} from "./baseScript.js";
import {BankMessaging} from "./messaging.js";
import {convertStrToMoney} from "./utils.js";

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

  handleWithdrawals(handle) {
    let withdraws = [];
    let data = [];

    for (let req of handle.data) {
      if (req.data.type === BankMessaging.WITHDRAW) {
        withdraws.push(req);
      } else {
        data.push(req);
      }
    }

    handle.data = data;

    for (let req of withdraws) {
      let wallet = this.wallet(req.data.wallet);
      let amount = req.data.amount;
      this.state.allocatedMoney -= amount;
      wallet.amount -= amount;
    }

    for (let req of withdraws) {
      this.messaging.sendResponse(req, {success: true});
    }
  }

  async eventLoop() {
    let handle = this.messaging.requestHandle();
    while (true) {
      this.handleWithdrawals(handle);
      this.update();

      while (handle.data.length > 0) {
        let message = handle.data.shift();

        try {
          await this.handleRequest(message);
        } catch (e) {
          this.tlog(
            `Error handling bank message: ${e instanceof String ? e : e.stack}`
          );
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
    } else if (type === BankMessaging.STOCK_BUY) {
      return this.stockBuy(req);
    } else if (type === BankMessaging.SELL_STOCKS) {
      return this.sellStocks(req);
    } else if (type === BankMessaging.CLEAR) {
      this.initializeState();
      return this.messaging.sendResponse(req, {success: true});
    } else {
      this.tlog(`Bank received unknown message type: ${type}`);
    }
  }

  stockBuy(req) {
    let {symbol, shares} = req.data;
    let sharePrice = this.ns.getStockAskPrice(symbol);
    let cost = shares * sharePrice;
    let wallet = this.wallet(req.data.wallet);

    let purchased = this.purchaseForWallet(
      wallet,
      cost,
      `Buying shares ${shares} of stock ${symbol}`,
      () => {
        return this.ns.buyStock(symbol, shares);
      }
    );

    return this.messaging.sendResponse(req, {purchased});
  }

  sellStocks(req) {
    let {sells} = req.data;
    let wallet = this.wallet(req.data.wallet);

    let success = this.purchaseForWallet(wallet, 0, `Selling shares`, () => {
      for (let symbol of Object.keys(sells)) {
        let shares = sells[symbol];
        this.ns.sellStock(symbol, shares);
      }
    });

    return this.messaging.sendResponse(req, {success});
  }

  allWalletsInfo(req) {
    let wallets = this.clone(this.wallets);
    return this.messaging.sendResponse(req, {wallets: wallets});
  }

  purchaseServer(req) {
    let wallet = this.wallet(req.data.wallet);
    let name = req.data.serverName;
    let ram = req.data.ram;

    let cost = this.ns.getPurchasedServerCost(ram);
    let purchased = this.purchaseForWallet(
      wallet,
      cost,
      `Buying server of size: ${ram} name: ${name}`,
      () => {
        this.ns.purchaseServer(name, ram);
      }
    );

    return this.messaging.sendResponse(req, {purchased});
  }

  purchaseEquipment(req) {
    let wallet = this.wallet(req.data.wallet);
    let name = req.data.memberName;
    let equipment = req.data.equipmentName;

    let cost = this.ns.gang.getEquipmentCost(equipment);

    let purchased = this.purchaseForWallet(
      wallet,
      cost,
      `Buying ${equipment} at ${cost} for ${name}`,
      () => {
        this.ns.gang.purchaseEquipment(name, equipment);
      }
    );
    this.messaging.sendResponse(req, {purchased});
  }

  setBalances(req) {
    let amountSum = this.walletTotal();
    for (let {name, amount} of req.data.sets) {
      let wallet = this.wallet(name);
      amountSum = amountSum - wallet.amount + amount;
    }

    let success = false;
    if (amountSum < this.actualMoney()) {
      success = true;

      for (let {name, amount, portion = null} of req.data.sets) {
        let wallet = this.wallet(name);
        wallet.amount = amount;
        if (portion) {
          wallet.portion = portion;
        }
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

  purchaseForWallet(wallet, cost, description, fn) {
    if (cost > wallet.amount) return false;

    let currentMoney = this.actualMoney();
    this.log(`Performing Purchase: ${description}`);
    fn();
    let newMoney = this.actualMoney();

    let diff = currentMoney - newMoney;
    this.log(`Purchase Cost for: ${description} cost: ${diff}`);
    wallet.amount -= diff;

    this.state.allocatedMoney = newMoney;
    this.saveState();

    return true;
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
      let leftDiff = diff;
      let priorities = Object.keys(walletsHash).sort((a, b) => a - b);
      for (let priority of priorities) {
        let wallets = walletsHash[priority];

        for (let wallet of wallets) {
          if (wallet.minMaxMoney && this.state.maxMoney < wallet.minMaxMoney) {
            continue;
          }

          if (wallet.reserve) {
            if (wallet.reserve > wallet.amount) {
              let wants = wallet.reserve - wallet.amount;
              let change = Math.min(wants, diff);
              diff -= change;
              leftDiff -= change;
              wallet.amount += change;
            }
          }

          let diffPortion = Math.min(
            Math.floor(diff * wallet.portion),
            leftDiff
          );
          wallet.amount += diffPortion;
          leftDiff = Math.max(leftDiff - diffPortion, 0);
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
    this.state.maxMoney = Math.max(currentMoney, this.state.maxMoney);
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
      maxMoney: 0,
    };

    this.addWallet({name: "gang", portion: 0.01});
    this.addWallet({name: "servers", portion: 0.9, priority: 4});
    this.addWallet({
      name: "stocks",
      portion: 0.01,
      minMaxMoney: convertStrToMoney("10b"),
    });
    // this.addWallet({name: "rest", portion: 0.09, priority: 100});

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
