import * as TK from "./tk.js";
import {FACTIONS} from "./gameConstants.js";
import {Player} from "./singularity.js";
import {json} from "./utils.js";

class ThisScript extends TK.Script {
  async perform() {
    this.dryRun = false;
    let suppressSleep = false;

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
      this.tlog(`Sleeping 10s for money`);
      await this.sleep(10000);
    }

    let faction = this.highestFaction();
    this.tlog(
      `Selected ${faction}: ${Math.floor(
        this.ns.getFactionRep(faction)
      )} reputation`
    );

    await this.buyAugs(faction);

    if (this.dryRun) {
      this.tlog(`Done with dryrun`);
      return;
    }

    while (true) {
      this.tlog(`Buying NeuroFlux`);
      let success = this.ns.purchaseAugmentation(faction, "NeuroFlux Governor");
      if (!success) break;
    }

    this.ns.purchaseAugmentation(faction, "The Red Pill");

    while (true) {
      this.tlog(`Upgrading Ram`);
      let success = await this.ns.upgradeHomeRam();
      if (!success) break;
    }

    this.tlog(`Installing Augments...`);
    await this.ns.installAugmentations("break-it.js");
  }

  async buyAugs(faction) {
    let augs = this.augments(faction);
    while (augs.length <= 1) {
      this.tlog(`Waiting for more reputation for augs`);
      await this.sleep(10000);
      augs = this.augments(faction);
    }

    let buyableAugs = this.buyableAugs(augs);
    while (buyableAugs.length <= 1) {
      this.tlog(`Waiting for more money for augs`);
      await this.sleep(10000);
      buyableAugs = this.buyableAugs(augs);
    }

    for (let aug of buyableAugs) {
      this.buyAug(faction, aug.name);
    }
  }

  buyAug(faction, name) {
    this.tlog(`Buying {name} from ${faction}`);
    this.ns.purchaseAugmentation(faction, name);
  }

  buyableAugs(augs) {
    let money = this.home.money();
    let sortedAugs = augs.sort((a, b) => b.cost - a.cost);

    let cost = 0;
    let buyable = [];
    for (let aug of sortedAugs) {
      let augCost = aug.cost * Math.pow(1.9, buyable.length);
      this.tlog(
        `Examining ${aug.name} cost: ${this.cFormat(augCost)} < ${this.cFormat(
          money
        )}`
      );
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
    return names
      .map(n => {
        let costs = this.ns.getAugmentationCost(n);
        return {
          name: n,
          repCost: costs[0],
          cost: costs[1],
        };
      })
      .filter(a => a.repCost <= reputation);
  }

  highestFaction() {
    let factions = [...FACTIONS].sort((a, b) => {
      return this.ns.getFactionRep(b) - this.ns.getFactionRep(a);
    });

    return factions[0];
  }
}

export let main = ThisScript.runner();
