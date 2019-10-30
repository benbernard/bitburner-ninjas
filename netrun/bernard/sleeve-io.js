import * as TK from "./tk.js";
import {Sleeve} from "./sleeves.js";
import {_, json} from "./utils.js";
import {canonicalStat} from "./gameConstants.js";

class ThisScript extends TK.Script {
  async perform() {
    let sleeves = Sleeve.getSleeves(this.ns);
    this.sleeves = sleeves;
    let mode = this.pullFirstArg() || "train";

    if (mode === "train") {
      let target = this.pullFirstArg() || 50;
      let stats = ["str", "def", "dex", "agi"].map(canonicalStat);
      await this.train(stats, target);
    } else if (mode === "murder") {
      this.crime("Homicide");
    } else if (mode === "hack") {
      this.hack();
    }
  }

  hack() {
    for (let sleeve of this.sleeves) {
      sleeve.train("hacking");
    }
  }

  crime(crime) {
    for (let sleeve of this.sleeves) {
      sleeve.commitCrime(crime);
    }
  }

  async train(stats, target = 20) {
    for (let stat of stats) {
      for (let sleeve of this.sleeves) {
        sleeve.train(stat);
      }

      while (true) {
        if (this.sleeves.every(s => s.hasStatAt(stat, target))) {
          break;
        }

        await this.sleep(5000);
      }
    }
  }
}

export let main = ThisScript.runner();
