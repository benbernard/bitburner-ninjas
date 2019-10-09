import * as TK from "./tk.js";
import {BankMessaging} from "./messaging.js";
import {NSObject} from "./baseScript.js";

const BANK_INFO_FILE = "bank-info.txt";

class ThisScript extends TK.Script {
  async perform() {
    this.setup();
    this.messaging = new BankMessaging(this.ns);
    if (this.args[0] === "clear") {
      this.initializeState();
    }

    await this.eventLoop();
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
      this.messaging.sendResponse(req, this.clone(this.wallet(name)));
    } else if (type === BankMessaging.PURCHASE_SERVER) {
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

      this.messaging.sendResponse(req, {purchased});
    } else if (type === BankMessaging.PURCHASE_EQUIPMENT) {
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
    } else if (type === BankMessaging.DEPOSIT) {
      let wallet = this.wallet(req.data.wallet);
      let amount = req.data.amount;
      this.deposit(wallet, amount, req);
    } else if (type === BankMessaging.SET_BALANCES) {
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

      this.messaging.sendResponse(req, {success});
    } else if (type === BankMessaging.ALL_WALLETS) {
      return this.messaging.sendResponse(req, {wallets: this.wallets});
    } else if (type === BankMessaging.CLEAR) {
      this.initializeState();
      this.messaging.sendResponse(req, {success: true});
    } else {
      this.tlog(`Bank received unknown message type: ${type}`);
    }
  }

  deposit(wallet, amount, req) {
    if (amount > this.unallocatedMoney()) {
      this.messaging.sendResponse(req, {success: false});
    }

    wallet.amount += amount;
    this.saveState();

    this.messaging.sendResponse(req, {success: true});
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
    this.wallets.forEach(w => {
      let diffPortion = diff * w.portion;
      w.amount += Math.floor(diffPortion);
    });

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

  initializeState() {
    this.state = {};

    this.state.wallets = {
      gang: {
        portion: 0.3,
        amount: 0,
        name: "gang",
      },
      servers: {
        portion: 0.5,
        amount: 0,
        name: "servers",
      },
    };

    this.state.allocatedMoney = 0;
    this.state.hackingLevel = this.actualHackingLevel();
    this.saveState();
  }

  actualMoney() {
    return this.ns.getServerMoneyAvailable("home");
  }

  saveState() {
    this.ns.write(BANK_INFO_FILE, JSON.stringify(this.state, null, 2), "w");
  }
}

export let main = ThisScript.runner();
