import {BaseScript, NSObject} from "./baseScript.js";
import {CRIMES} from "./gameConstants.js";

const STOP_FILE = "stop_file.txt";
const TOGGLE_FILE = "toggle_file.txt";

const SECTOR12 = "Sector-12";
const VOLHAVEN = "Volhaven";

const CITY_UNIVERSITY = {
  [SECTOR12]: "Rothman University",
  [VOLHAVEN]: "ZB Institute Of Technology",
};

const UNIVERSITY_COURSE = {
  hacking: "Algorithms",
  charisma: "Leadership",
};

const GYM_NAME = "Powerhouse Gym";
const GYM_CITY = SECTOR12;

export const STAT_MAP = {
  str: "strength",
  dex: "dexterity",
  agi: "agility",
  def: "defense",

  strength: "strength",
  dexterity: "dexterity",
  agility: "agility",
  defense: "defense",

  hacking: "hacking",
  hack: "hacking",

  chr: "charisma",
  charisma: "charisma",
};

const TRAINING_TYPES = {
  strength: "workout",
  dexterity: "workout",
  agility: "workout",
  defense: "workout",

  hacking: "university",
  charisma: "university",
};

export class Player extends NSObject {
  isBusy() {
    return this.ns.isBusy();
  }

  stats() {
    return this.info.mult;
  }

  info() {
    return this.ns.getCharacterInformation();
  }

  get city() {
    return this.info().city;
  }

  async travel(city) {
    if (this.city !== city) {
      await this.ns.travelToCity(city);
    }
  }

  async workout(type) {
    await this.travel(GYM_CITY);

    let success = await this.ns.gymWorkout(GYM_NAME, type);
    if (!success)
      throw new Error(`Could not work out for ${type}, check city?`);
    return success;
  }

  ownedAugments() {
    throw new Error("import singularityAugments");
  }

  validCrime(crime) {
    return CRIMES.has(crime);
  }

  async commitCrime(crime) {
    if (!this.validCrime(crime)) throw new Error("Invalid crime: ${crime}");

    let result = await this.ns.commitCrime(crime);
    await this.waitUntilNotBusy();
    return result;
  }

  getStat(stat) {
    return this.ns.getStats()[STAT_MAP[stat]];
  }

  train(statTerm) {
    if (!(statTerm in STAT_MAP)) {
      throw new Error(`Unrecognized stat: ${statTerm}`);
    }

    let stat = STAT_MAP[statTerm];

    let type = TRAINING_TYPES[stat];
    if (type === "workout") {
      return this.workout(stat);
    } else if (type === "university") {
      return this.university(stat);
    } else {
      throw new Error(`Untrainable Stat: ${stat}`);
    }
  }

  university(stat) {
    if (["hacking", "charisma"].indexOf(stat) === -1)
      throw new Error(`Cannot university train ${stat}`);

    if (
      this.city !== SECTOR12 ||
      this.ns.getServerMoneyAvailable("home") > 1000000000
    ) {
      this.travel(VOLHAVEN);
    }

    let university = CITY_UNIVERSITY[this.city];
    let course = UNIVERSITY_COURSE[stat];

    return this.ns.universityCourse(university, course);
  }

  async trainTo(stat, target) {
    if (this.getStat(stat) >= target) return;

    this.tlog(`Training ${stat} to ${target}`);
    await this.train(stat);
    while (this.getStat(stat) < target) {
      await this.sleep(10000);
      await this.checkStop();
      await this.stop();

      this.train(stat);
    }

    this.tlog(`Done training ${stat} to ${target}`);
    await this.checkStop();
  }

  async waitUntilNotBusy(interval = 100) {
    while (this.isBusy()) {
      await this.checkStop();
      await this.sleep(interval);
    }

    await this.checkStop();
  }

  stop() {
    return this.ns.stopAction();
  }

  initPlayerLoop(script) {
    this.stopped = false;
    let remove = script.addOptionButton("Stop Loop", () => {
      this.stopped = true;
      this.stop();
      remove();
    });

    return remove;
  }

  async checkStop() {
    if (this.stopped) {
      await this.stop();
      await this.exit(`Stopped Actions by Server`);
    } else if (this.stopped !== false) {
      throw new Error(
        `Cannot use checkStop without calling initPlayerLoop first stopped: ${this.stopped}`
      );
    }
  }
}
