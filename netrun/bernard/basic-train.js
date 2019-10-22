import {BaseScript, NSObject} from "./baseScript.js";
import {canonicalStat} from "./gameConstants.js";

const GYM_NAME = "Powerhouse Gym";
const TOGGLE_FILE = "toggle_file.txt";
const STOP_FILE = "stop_file.txt";

class ThisScript extends BaseScript {
  async perform() {
    this.ns.tail();
    this.stopped = false;
    this.addRemovingButton("Stop Loop", () => {
      this.stopped = true;
      this.ns.stopAction();
    });

    let target = parseInt(this.ns.args[0] || 20);

    await this.train("str", target);
    await this.train("dex", target);
    await this.train("agi", target);
    await this.train("def", target);
  }

  async train(stat, target) {
    stat = canonicalStat(stat);
    if (this.getStat(stat) >= target) return;

    this.tlog(`Training ${stat} to ${target}`);
    let result = await this.gym(stat);
    if (!result) {
      throw new Error("Bad gym training, are you in sector 12?");
    }

    while (this.getStat(stat) < target) {
      await this.sleep(10000);
      await this.checkStop();

      this.gym(stat);
    }

    this.tlog(`Done training ${stat} to ${target}`);
    await this.checkStop();
    this.ns.stopAction();
  }

  gym(stat) {
    return this.ns.gymWorkout(GYM_NAME, stat);
  }

  getStat(name) {
    return this.ns.getStats()[name];
  }

  async checkStop() {
    if (!this.stopped) return;
    this.ns.stopAction();
    await this.exit(`Stopped Actions by Server`);
  }
}

export let main = ThisScript.runner();
