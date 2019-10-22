import * as TK from "./tk.js";
import {FACTIONS} from "./gameConstants.js";
import {Player} from "./singularity.js";

class ThisScript extends TK.Script {
  async perform() {
    let faction = this.highestFaction();
    this.tlog(
      `Selected ${faction}: ${Math.floor(
        this.ns.getFactionRep(faction)
      )} reputation`
    );

    let proceed = await this.ns.prompt(
      `Use all money to buy NeuroFlex and install augments?`
    );

    if (!proceed) await this.exit();

    this.tlog("Spending hashes for money");
    while (this.ns.hacknet.numHashes() > 4) {
      this.ns.hacknet.spendHashes("Sell for Money");
    }

    while (true) {
      this.tlog(`Buying NeuroFlux`);
      let success = this.ns.purchaseAugmentation(faction, "NeuroFlux Governor");
      if (!success) break;
    }

    this.ns.purchaseAugmentation("Daedalus", "The Red Pill");

    while (true) {
      this.tlog(`Upgrading Ram`);
      let success = await this.ns.upgradeHomeRam();
      if (!success) break;
    }

    this.tlog(`Installing Augments...`);
    let result = await this.ns.prompt("Actually Install?");
    if (!result) return;
    await this.ns.installAugmentations();
  }

  highestFaction() {
    let factions = [...FACTIONS].sort((a, b) => {
      return this.ns.getFactionRep(b) - this.ns.getFactionRep(a);
    });

    return factions[0];
  }
}

export let main = ThisScript.runner();
