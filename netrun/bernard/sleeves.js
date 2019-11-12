import {NSObject} from "./baseScript.js";
import {_, json} from "./utils.js";
import {canonicalStat} from "./gameConstants.js";

const GYM_NAME = "Powerhouse Gym";

export class Sleeve extends NSObject {
  constructor(ns, num) {
    super(ns);
    this.num = num;
  }

  get s() {
    return this.ns.sleeve;
  }

  sync() {
    return this.s.synchronize(this.num);
  }

  shock() {
    return this.s.setToShockRecovery(this.num);
  }

  buyableAugs() {
    return this.s.getSleevePurchasableAugs(this.num);
  }

  static getSleeves(ns) {
    let sleeves = [];
    for (let i = 0; i < ns.sleeve.getNumSleeves(); i++) {
      sleeves.push(new Sleeve(ns, i));
    }
    return sleeves;
  }

  train(inputStat) {
    let stat = canonicalStat(inputStat);
    if (stat === "hacking") {
      this.s.setToUniversityCourse(
        this.num,
        "Rothman University",
        "Algorithms"
      );
    } else if (stat === "charisma") {
      this.s.setToUniversityCourse(
        this.num,
        "Rothman University",
        "Leadership"
      );
    } else {
      this.s.setToGymWorkout(this.num, GYM_NAME, stat);
    }
  }

  hasStatAt(stat, target) {
    return this.s.getSleeveStats(this.num)[stat] >= target;
  }

  commitCrime(crime) {
    return this.s.setToCommitCrime(this.num, crime);
  }
}
