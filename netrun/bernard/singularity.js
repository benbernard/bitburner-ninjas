import {BaseScript, NSObject} from "./baseScript.js";

const STOP_FILE = "stop_file.txt";
const TOGGLE_FILE = "toggle_file.txt";

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

export const CITIES = new Set([
  "Aevum",
  "Sector-12",
  "New Tokyo",
  "Chongqing",
  "Ishima",
  "Volhaven",
]);

export const COMPANIES = {
  AeroCorp: "Aevum",
  "Bachman & Associates": "Aevum",
  "Clarke Incorporated": "Aevum",
  ECorp: "Aevum",
  "Fulcrum Technologies": "Aevum",
  "Galactic Cybersystems": "Aevum",
  "NetLink Technologies": "Aevum",
  "Aevum Police Headquarters": "Aevum",
  "Rho Construction": "Aevum",
  "Watchdog Security": "Aevum",

  "KuaiGong International": "Chongqing",
  "Solaris Space Systems": "Chongqing",

  "Alpha Enterprises": "Sector-12",
  "Blade Industries": "Sector-12",
  "Central Intelligence Agency": "Sector-12",
  "Carmichael Security": "Sector-12",
  "Sector-12 City Hall": "Sector-12",
  DeltaOne: "Sector-12",
  FoodNStuff: "Sector-12",
  "Four Sigma": "Sector-12",
  "Icarus Microsystems": "Sector-12",
  "Joe's Guns": "Sector-12",
  MegaCorp: "Sector-12",
  "National Security Agency": "Sector-12",
  "Universal Energy": "Sector-12",

  DefComm: "New Tokyo",
  "Global Pharmaceuticals": "New Tokyo",
  "Noodle Bar": "New Tokyo",
  VitaLife: "New Tokyo",

  "Nova Medical": "Ishima",
  "Omega Software": "Ishima",
  "Storm Technologies": "Ishima",

  CompuTek: "Volhaven",
  "Helios Labs": "Volhaven",
  LexoCorp: "Volhaven",
  NWO: "Volhaven",
  "OmniTek Incorporated": "Volhaven",
  "Omnia Cybersystems": "Volhaven",
  "SysCore Securities": "Volhaven",
  "ZB Institute of Technology": "Volhaven",
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
    this.train(stat);
    while (this.getStat(stat) < target) {
      await this.sleep(10000);
      await this.checkStop();
      await this.stop();

      this.train(stat);
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

  async initPlayerLoop() {
    await this.ns.wget("http://localhost:3000/toggleStop/no", TOGGLE_FILE);
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
