import {BankScript} from "../bank.js";

function assertEqual(a, b, message) {
  if (!message) message = `${a} != ${b}`;
  assert(a === b, message);
}

function assert(bool, message = "Error") {
  if (!bool) throw new Error(message);
}

let money = 1000;
let ns = {
  logs: [],

  tlog(msg) {
    this.logs.push(msg);
  },

  sleep() {},

  getPurchasedServerCost() {
    return 1000;
  },

  purchaseServer() {
    money -= this.getPurchasedServerCost();
  },

  fileExists() {
    return false;
  },

  read() {
    return "";
  },

  hackingLevel: 10,
  getHackingLevel() {
    return this.hackingLevel;
  },

  get money() {
    return money;
  },

  getServerMoneyAvailable() {
    return this.money;
  },

  write() {},

  gang: {
    getEquipmentCost() {
      return 1000;
    },

    purchaseEquipment() {
      money -= this.getEquipmentCost();
    },
  },

  args: [],
  disableLog() {},
};

async function test() {
  console.log("Initializing");
  let script = new BankScript(ns, false);
  await script.perform();

  // Standard distribution
  (function () {
    script.initializeState();
    money = 1000;

    script.state.wallets = [];
    script.addWallet({name: "gang", portion: 0.3});
    script.addWallet({name: "servers", portion: 0.5});
    script.addWallet({name: "rest", portion: 0.2, priority: 6});
    script.update();

    assertEqual(script.state.allocatedMoney, money);
    assertEqual(script.state.wallets.servers.amount, 500);
    assertEqual(script.state.wallets.gang.amount, 300);
    assertEqual(script.state.wallets.rest.amount, 200);

    // No change because no money changed
    script.update();

    assertEqual(script.state.allocatedMoney, money);
    assertEqual(script.state.wallets.servers.amount, 500);
    assertEqual(script.state.wallets.gang.amount, 300);
    assertEqual(script.state.wallets.rest.amount, 200);

    money = 900;
    script.update();

    assertEqual(script.state.allocatedMoney, money);
    assertEqual(script.state.wallets.servers.amount, 500);
    assertEqual(script.state.wallets.gang.amount, 300);
    assertEqual(script.state.wallets.rest.amount, 100);

    money = 800;
    script.update();

    assertEqual(script.state.allocatedMoney, money);
    assertEqual(script.state.wallets.servers.amount, 500);
    assertEqual(script.state.wallets.gang.amount, 300);
    assertEqual(script.state.wallets.rest.amount, 0);

    money = 500;
    script.update();

    assertEqual(script.state.allocatedMoney, money);
    assertEqual(script.state.wallets.servers.amount, 312);
    assertEqual(script.state.wallets.gang.amount, 187);
    assertEqual(script.state.wallets.rest.amount, 0);

    money = 0;
    script.update();

    assertEqual(script.state.allocatedMoney, money);
    assertEqual(script.state.wallets.servers.amount, 0);
    assertEqual(script.state.wallets.gang.amount, 0);
    assertEqual(script.state.wallets.rest.amount, 0);
  })();

  // reserved high pri
  (function () {
    script.initializeState();
    money = 1000;

    script.state.wallets = [];
    script.addWallet({name: "gang", portion: 0.3});
    script.addWallet({name: "servers", portion: 0.5});
    script.addWallet({name: "rest", portion: 0.2, priority: 6});
    script.addWallet({name: "fun", portion: 0, priority: 1, reserve: 600});
    script.update();

    assertEqual(script.state.allocatedMoney, money);
    assertEqual(script.state.wallets.servers.amount, 200);
    assertEqual(script.state.wallets.gang.amount, 120);
    assertEqual(script.state.wallets.rest.amount, 80);
    assertEqual(script.state.wallets.fun.amount, 600);

    money = 800;
    script.update();
    assertEqual(script.state.wallets.servers.amount, 125);
    assertEqual(script.state.wallets.gang.amount, 75);
    assertEqual(script.state.wallets.rest.amount, 0);
    assertEqual(script.state.wallets.fun.amount, 600);
  })();
}

let promise = test();
promise.then(
  () => console.log(`Finished successfully!`),
  err => console.error(err.stack)
);
