import {BaseScript, NSObject} from "./baseScript.js";

const STOP_FILE = "stop_file.txt";

export const CRIMES = [
  "shoplift",
  "rob store",
  "mug",
  "larceny",
  "deal drugs",
  "bond forgery",
  "traffick arms",
  "homicide",
  "grand theft auto",
  "kidnap",
  "assassinate",
  "heist",
];

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
  dex: "dexerity",
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
    return this.ns.getStats();
  }

  info() {
    return this.ns.getCharacterInformation();
  }

  get city() {
    return this.info().city;
  }

  async travel(city) {
    if (this.city !== GYM_CITY) {
      await this.ns.travelToCity(GYM_CITY);
    }
  }

  async workout(type) {
    await this.travel(GYM_CITY);

    let success = await this.ns.gymWorkout(GYM_NAME, type);
    if (!success)
      throw new Error(`Could not work out for ${type}, check city?`);
    return success;
  }

  validCrime(crime) {
    return CRIMES.indexOf(crime) !== -1;
  }

  async commitCrime(crime) {
    if (!this.validCrime(crime)) throw new Error("Invalid crime: ${crime}");

    let result = await this.ns.commitCrime(crime);
    await this.waitUntilNotBusy();
    return result;
  }

  getStat(stat) {
    return this.stats()[STAT_MAP[stat]];
  }

  train(statTerm) {
    if (!(statTerm in STAT_MAP)) {
      throw new Error(`Unrecognized stat: ${stat}`);
    }

    let stat = STAT_MAP[stat];

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

    if (this.city !== SECTOR12) {
      this.travel("Volhaven");
    }

    let university = CITY_UNIVERSITY[this.city];
    let course = UNIVERSITY_COURSE[stat];

    return this.ns.universityCourse(university, course);
  }

  async trainTo(stat, target) {
    if (this.getStat(stat) >= target) return;

    this.tlog(`Training ${stat} to ${target}`);
    while (this.getStat(stat) < target) {
      this.train(stat);

      await this.sleep(10000);
      await this.checkStop();
      await this.stop();
    }

    this.tlog(`Done training ${stat} to ${target}`);
    await this.checkStop();
  }

  async waitUntilNotBusy() {
    while (this.isBusy()) {
      await this.checkStop();
      await this.sleep(100);
    }

    await this.checkStop();
  }

  stop() {
    return this.ns.stopAction();
  }

  async checkStop() {
    await this.ns.wget("http://localhost:3000/shouldStop", STOP_FILE);
    let contents = await this.ns.read(STOP_FILE);
    if (contents.toLowerCase() === "yes") {
      await this.stop();
      await this.exit(`Stopped Actions by Server`);
    }
  }
}
