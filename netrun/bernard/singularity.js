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

const GYM_NAME = "Powerhouse Gym";
const GYM_CITY = "Sector-12";

const statMap = {
  str: "strength",
  dex: "dexerity",
  agi: "agility",
  def: "defense",

  strength: "strength",
  dexterity: "dexterity",
  agility: "agility",
  defense: "defense",
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

  async workout(type) {
    if (this.info().city !== GYM_CITY) {
      await this.ns.travelToCity(GYM_CITY);
    }

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
    return this.stats()[statMap[stat]];
  }

  train(stat) {
    if (!(stat in statMap)) {
      throw new Error(`Unrecognized stat: ${stat}`);
    }

    return this.workout(statMap[stat]);
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
