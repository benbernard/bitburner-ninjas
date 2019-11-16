import {BaseScript} from "./baseScript.js";
import {_} from "./utils.js";
import {BankMessaging} from "./messaging.js";

const UPGRADE_ACTIONS = {
  LEVEL: (i, ns) => {
    ns.hacknet.upgradeLevel(i, 1);
  },
  RAM: (i, ns) => {
    ns.hacknet.upgradeRam(i, 1);
  },
  CORE: (i, ns) => {
    ns.hacknet.upgradeCore(i, 1);
  },
  CACHE: (i, ns) => {
    ns.hacknet.upgradeCache(i, 1);
  },
};

const UPGRADE_COSTS = {
  LEVEL: (i, ns) => {
    return ns.hacknet.getLevelUpgradeCost(i, 1);
  },
  RAM: (i, ns) => {
    return ns.hacknet.getRamUpgradeCost(i, 1);
  },
  CORE: (i, ns) => {
    return ns.hacknet.getCoreUpgradeCost(i, 1);
  },
  // CACHE: (i, ns) => {
  //   return ns.hacknet.getCacheUpgradeCost(i, 1);
  // },
};

class ThisScript extends BaseScript {
  async perform() {
    let suppressUpgrades = false;
    let firstArg = this.pullFirstArg();
    this.serverTarget = null;
    if (firstArg === "true") {
      suppressUpgrades = true;
      firstArg = this.pullFirstArg();
    }

    this.serverTarget = firstArg;

    this.bank = new BankMessaging(this.ns);
    this.tlog(this.reserveHashes());
    while (true) {
      this.createMoney();
      await this.sleep(500);

      let wallet = await this.bank.walletInfo("hacknet");
      let usableMoney = wallet.amount;

      if (!suppressUpgrades) await this.upgradeServers(usableMoney);
      await this.sleep(5000);
    }
  }

  async upgradeServers(money) {
    let originalMoney = money;

    while (money > this.ns.hacknet.getPurchaseNodeCost()) {
      money -= this.ns.hacknet.getPurchaseNodeCost();
      this.ns.hacknet.purchaseNode();
    }

    while (true) {
      let [cost, action, server] = this.cheapestUpgrade();
      if (cost < money) {
        UPGRADE_ACTIONS[action](server, this.ns);
        money -= cost;
      } else {
        break;
      }
    }

    await this.bank.withdraw("hacknet", originalMoney - money);
  }

  cheapestUpgrade() {
    let serverCount = this.ns.hacknet.numNodes();
    let min = Number.MAX_SAFE_INTEGER;
    let server;
    let action;

    // Note: excluding hacknet-node-0 from this
    for (let i = 0; i < serverCount; i++) {
      // for (let i = 3; i < serverCount; i++) {
      let [cost, key] = this.minActionForServer(i);

      if (cost < min) {
        min = cost;
        action = key;
        server = i;
      }
    }

    return [min, action, server];
  }

  minActionForServer(num) {
    let min = Number.MAX_SAFE_INTEGER;
    let action;
    for (let key of _.keys(UPGRADE_COSTS)) {
      let cost = UPGRADE_COSTS[key](num, this.ns);
      if (cost < min) {
        min = cost;
        action = key;
      }
    }

    return [min, action];
  }

  createMoney() {
    while (this.ns.hacknet.numHashes() > this.reserveHashes()) {
      if (this.serverTarget) {
        let result = this.ns.hacknet.spendHashes(
          "Increase Maximum Money",
          "phantasy"
        );
        this.ns.hacknet.spendHashes("Reduce Minimum Security", "phantasy");
        if (result) {
          break;
        } else {
          this.ns.hacknet.spendHashes("Sell for Money");
        }
      } else {
        this.ns.hacknet.spendHashes("Sell for Money");
        // this.ns.hacknet.spendHashes("Improve Gym Training");
      }
    }
  }

  reserveHashes() {
    return 0.8 * this.totalCache();
  }

  totalCache() {
    let count = this.ns.hacknet.numNodes();
    let cache = 0;
    for (let i = 0; i < count; i++) {
      cache += this.ns.hacknet.getNodeStats(i).hashCapacity;
    }

    return cache;
  }
}

export let main = ThisScript.runner();
