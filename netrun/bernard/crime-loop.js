import * as TK from "./tk.js";
import {Player} from "./singularity.js";

class ThisScript extends TK.Script {
  async perform() {
    this.player = new Player(this.ns);
    await this.player.initPlayerLoop();

    await this.upgradeHomeRam();
    await this.player.trainTo("hack", 50);
    await this.player.trainTo("str", 30);
    await this.player.trainTo("def", 30);

    while (true) {
      await this.upgradeHomeRam();
      await this.player.commitCrime("mug");
    }
  }

  async upgradeHomeRam() {
    if (this.home.ram() < 1024) {
      let cost = this.ns.getUpgradeHomeRamCost();
      while (this.home.money() > cost && this.home.ram() < 1024) {
        this.tlog(`Upgrading home ram`);
        await this.ns.upgradeHomeRam();
      }
    }
  }
}

export let main = ThisScript.runner();
