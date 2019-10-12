import * as TK from "./tk.js";
import {FACTIONS, Player} from "./singularity.js";

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

    while (true) {
      this.tlog(`Buying NeuroFlux`);
      let success = this.ns.purchaseAugmentation(faction, "NeuroFlux Governor");
      if (!success) break;
    }

    while (true) {
      this.tlog(`Upgrading Ram`);
      let success = await this.ns.upgradeHomeRam();
      if (!success) break;
    }

    this.tlog(`Installing Augments...`);
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
