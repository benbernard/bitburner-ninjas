import {BaseScript, NSObject} from "./baseScript.js";
import {canonicalStat} from "./gameConstants.js";

const GYM_NAME = "Powerhouse Gym";
const TOGGLE_FILE = "toggle_file.txt";
const STOP_FILE = "stop_file.txt";

class ThisScript extends BaseScript {
  async perform() {
    await this.ns.wget("http://localhost:3000/toggleStop/no", TOGGLE_FILE);

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
    await this.gym(stat);
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
    await this.ns.wget("http://localhost:3000/shouldStop", STOP_FILE);
    let contents = await this.ns.read(STOP_FILE);
    if (contents.toLowerCase() === "yes") {
      this.ns.stopAction();
      await this.exit(`Stopped Actions by Server`);
    }
  }
}

export let main = ThisScript.runner();
