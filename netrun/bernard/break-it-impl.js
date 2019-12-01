import * as TK from "./tk.js";
import {FACTIONS} from "./gameConstants.js";
import {Player} from "./singularity.js";
import {json} from "./utils.js";

let logFile = "break-it-log.txt";

class ThisScript extends TK.Script {
  loadBoughtLog() {
    this.boughtLog = [];
    if (this.home.fileExists(logFile)) {
      let contents = this.ns.read(logFile);
      this.boughtLog.push(contents);
      this.tlog(contents);
    }
  }

  writeBoughtLog() {
    this.ns.write(logFile, this.boughtLog.join("\n"), "w");
  }

  async perform() {
    this.dryRun = false;
    let suppressSleep = false;

    this.loadBoughtLog();

    let arg = this.pullFirstArg();
    if (arg && arg.startsWith("--")) {
      if (arg === "--dryrun") {
        this.tlog(`Doing dryrun`);
        this.dryRun = true;
        suppressSleep = true;
      } else {
        this.exit(`Only --dryrun can be used as a -- argument`);
      }
    } else {
      suppressSleep = arg === "true";
    }

    if (!suppressSleep) {
      this.tlog(`Sleeping 20s for money`);
      await this.sleep(20000);
    }

    this.addBoughtLog(
      `Starting break-it run with ${this.cFormat(this.home.money())}`
    );

    let faction = this.highestFaction();
    this.tlog(
      `Selected ${faction}: ${Math.floor(
        this.ns.getFactionRep(faction)
      )} reputation`
    );

    await this.buyAugs(faction);

    while (true) {
      this.tlog(`Buying NeuroFlux`);
      let success = this.buyAug(faction, "NeuroFlux Governor");
      if (!success) break;
    }

    if (this.dryRun) {
      this.writeBoughtLog();
      this.tlog(`Done with dryrun`);
      return;
    }

    while (true) {
      this.tlog(`Upgrading Ram`);
      let success = await this.ns.upgradeHomeRam();
      if (success) {
        this.addBoughtLog(`Upgraded Ram`);
      } else {
        break;
      }
    }

    this.writeBoughtLog();
    this.tlog(`Installing Augments...`);
    let success = this.ns.installAugmentations("break-it-impl.js");
    if (!success) {
      this.tlog(`Failed to install?!?`);
      this.ns.tail();
    }
    return;
  }

  async buyAugs(faction) {
    let augs = this.augments(faction);
    while (augs.length <= 1) {
      this.tlog(`Waiting for more reputation for augs, found ${augs.length}`);
      await this.sleep(10000);
      augs = this.augments(faction);
    }

    let buyableAugs = this.buyableAugs(augs);
    while (buyableAugs.length <= 1) {
      this.tlog(
        `Waiting for more money for augs, found: ${buyableAugs.length}`
      );
      await this.sleep(10000);
      buyableAugs = this.buyableAugs(augs);
    }

    for (let aug of buyableAugs) {
      this.buyAug(faction, aug.name);
    }
  }

  buyAug(faction, name) {
    let cost = this.cFormat(this.ns.getAugmentationCost(name)[1]);
    this.tlog(`Buying ${name} from ${faction} for ${cost}`);
    if (this.dryrun) {
      this.addBoughtLog(`Would buy ${name} from ${faction} for ${cost}`);
      return false;
    }

    if (this.ns.purchaseAugmentation(faction, name)) {
      this.addBoughtLog(`Bought ${name} from ${faction} for ${cost}`);
      return true;
    } else {
      this.addBoughtLog(`Failed to buy ${name}`);
      return false;
    }
  }

  addBoughtLog(msg) {
    this.boughtLog.push(msg);
  }

  buyableAugs(augs) {
    let money = this.home.money();
    let sortedAugs = augs.sort((a, b) => b.cost - a.cost);

    let cost = 0;
    let buyable = [];
    for (let aug of sortedAugs) {
      let augCost = aug.cost * Math.pow(1.9, buyable.length);
      if (cost + augCost < money) {
        buyable.push(aug);
        cost += augCost;
      }
    }

    return buyable;
  }

  augments(faction) {
    let names = this.ns.getAugmentationsFromFaction(faction);
    let reputation = this.ns.getFactionRep(faction);
    let owned = new Set(this.ns.getOwnedAugmentations(true));
    return names
      .map(n => {
        let costs = this.ns.getAugmentationCost(n);
        return {
          name: n,
          repCost: costs[0],
          cost: costs[1],
        };
      })
      .filter(a => a.repCost <= reputation)
      .filter(aug => !owned.has(aug.name))
      .filter(aug => {
        let prereqs = this.ns.getAugmentationPrereq(aug.name);
        for (let p of prereqs) {
          if (!owned.has(p)) return false;
        }
        return true;
      });
  }

  highestFaction() {
    let factions = [...FACTIONS].sort((a, b) => {
      return this.ns.getFactionRep(b) - this.ns.getFactionRep(a);
    });

    return factions[0];
  }
}

export let main = ThisScript.runner();
