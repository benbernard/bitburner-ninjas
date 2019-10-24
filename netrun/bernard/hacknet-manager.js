import {BaseScript} from "./baseScript.js";
import {_} from "./utils.js";

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
    this.tlog(this.reserveHashes());
    while (true) {
      this.createMoney();
      this.upgradeServers();
      await this.sleep(1000);
    }
  }

  upgradeServers() {
    this.ns.hacknet.purchaseNode();
    while (true) {
      let [cost, action, server] = this.cheapestUpgrade();
      if (cost < this.ns.getServerMoneyAvailable("home")) {
        UPGRADE_ACTIONS[action](server, this.ns);
      } else {
        return;
      }
    }
  }

  cheapestUpgrade() {
    let serverCount = this.ns.hacknet.numNodes();
    let min = Number.MAX_SAFE_INTEGER;
    let server;
    let action;

    for (let i = 0; i < serverCount; i++) {
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
      this.ns.hacknet.spendHashes("Sell for Money");
    }
  }

  reserveHashes() {
    return 0.9 * this.totalCache();
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
