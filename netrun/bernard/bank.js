import * as TK from "./tk.js";
import {BankMessaging} from "./messaging.js";
import {NSObject} from "./baseScript.js";

const BANK_INFO_FILE = "bank-info.txt";

class ThisScript extends TK.Script {
  async perform() {
    this.setup();
    this.messaging = new BankMessaging(this.ns);

    await this.eventLoop();
  }

  async eventLoop() {
    let handle = this.messaging.requestHandle();
    while (true) {
      this.updateMoney();

      while (handle.data.length > 0) {
        let message = handle.data.shift();
        this.handleRequest(message);
      }

      this.saveState();
      await this.ns.sleep(10);
    }
  }

  handleRequest(req) {
    this.messaging.sendResponse(req, {
      msg: "Hello World",
      req,
    });
  }

  updateMoney() {}

  setup() {
    this.disableLogging("sleep");
    if (this.ns.fileExists(BANK_INFO_FILE, "home")) {
      let contents = this.ns.read(BANK_INFO_FILE);
      this.state = JSON.parse(contents);
    }

    if (!this.state) {
      this.initializeState();
    }
  }

  initializeState() {
    this.state = {};
    this.state.budgets = {};
    this.state.maxMoney = 0;
    this.state.hackingLevel = this.ns.getHackingLevel();
    this.saveState();
  }

  actualMoney() {
    return this.ns.getServerMoneyAvailable(this.name);
  }

  maxMoney() {
    return this.state.maxMoney();
  }

  updateMaxMoney() {}

  saveState() {
    this.ns.write(BANK_INFO_FILE, JSON.stringify(this.state), "w");
  }
}

export let main = ThisScript.runner();
