import BaseScript from "./baseScript.js";
import {canonicalStat, canonicalSleeveCrime} from "./gameConstants.js";

const GYM_NAME = "Powerhouse Gym";

class ThisScript extends BaseScript {
  async perform() {
    let mode = this.pullFirstArg() || "train";
    let target = this.pullFirstArg();
    if (mode === "train") {
      target = target || 100;
    } else if (mode === "crime") {
      target = canonicalSleeveCrime(target || "shoplift");
    }

    while (true) {
      let allDone = true;
      for (let i = 0; i < this.ns.sleeve.getNumSleeves(); i++) {
        if (mode === "train") {
          let stats = this.ns.sleeve.getSleeveStats(i);
          for (let stat of ["str", "dex", "agi", "def"].map(canonicalStat)) {
            if (stats[stat] >= target) continue;
            this.ns.sleeve.setToGymWorkout(i, GYM_NAME, stat);

            allDone = false;
            break;
          }
        } else if (mode === "crime") {
          this.tlog(`Setting sleeve ${i} to ${target}`);
          this.ns.sleeve.setToCommitCrime(i, target);
        }
      }

      if (allDone) {
        if (mode === "train") {
          for (let i = 0; i < this.ns.sleeve.getNumSleeves(); i++) {
            this.ns.sleeve.setToCommitCrime(
              i,
              canonicalSleeveCrime("Homicide")
            );
          }
        }
        break;
      }
      await this.sleep(5000);
    }
  }
}

export let main = ThisScript.runner();
