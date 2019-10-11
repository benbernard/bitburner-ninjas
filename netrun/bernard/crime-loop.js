import * as TK from "./tk.js";
import {Player} from "./singularity.js";

class ThisScript extends TK.Script {
  async perform() {
    this.player = new Player(this.ns);

    await this.upgradeHomeRam();
    await this.player.trainTo("str", 100);
    await this.player.trainTo("def", 100);

    while (true) {
      await this.upgradeHomeRam();

      await this.player.commitCrime("homicide");
      await this.sleep(100);
    }
  }

  upgradeHomeRam() {
    if (this.home.ram() < 1024) {
      let cost = this.ns.getUpgradeHomeRamCost();
      while (this.home.money() > cost && this.home.ram() < 1024) {
        this.tlog(`Upgrading home ram`);
        this.ns.upgradeHomeRam();
      }
    }
  }
}

export let main = ThisScript.runner();
