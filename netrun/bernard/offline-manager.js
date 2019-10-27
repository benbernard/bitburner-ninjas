import {BaseScript, NSObject} from "./baseScript.js";
import {convertToPercent} from "./utils.js";
import {
  CITIES,
  COMPANIES,
  canonicalCompany,
  canonicalCrime,
  canonicalFaction,
  canonicalStat,
} from "./gameConstants.js";
import {Player} from "./singularity.js";

class ThisScript extends BaseScript {
  get player() {
    if (!this._player) this._player = new Player(this.ns);
    return this._player;
  }

  async perform() {
    let actions = this.makeActions(this.args);

    let count = 1;
    for (let action of actions) {
      if (action instanceof CrimeAction && count !== actions.length) {
        throw new Error(`CrimeAction not last action!`);
      }
      count++;

      this.tlog(`Will do action: ${action.info()}`);
    }

    let actionMessages = actions.map(a => a.info()).join("<br>\n");

    let doIt = await this.ns.prompt(
      `About to start offline efforts, summary:<br><br>${actionMessages}`
    );
    if (!doIt) await this.exit(`Cancelling...`);

    this.player.initPlayerLoop(this);

    for (let action of actions) {
      this.tlog(`Running ${action.info()}`);
      await action.perform();
    }

    this.tlog(`Done with offline tasks at ${this.logDate()}`);
  }

  // Examples:
  // s:str:150
  // f:NWO:rep:25000
  // f:NWO:favor:150
  // c:NWO:rep:2500
  // crime
  makeActions(actions) {
    return actions.map(spec => {
      let [type, ...args] = spec.split(":");

      let canonicalAction = canonicalActions[type];
      if (!canonicalAction) throw new Error(`Unknown action type: ${type}`);

      return ACTION_TYPES[canonicalAction].create(
        this.ns,
        this.player,
        ...args
      );
    });
  }
}

let canonicalActions = {
  stat: "stat",
  faction: "faction",
  corp: "corp",
  fullcorp: "fullcorp",
  crime: "crime",

  s: "stat",
  f: "faction",
  c: "crime",
  corporation: "corp",
};

class Action extends NSObject {
  constructor(ns, player) {
    super(ns);
    this.player = player;
  }

  targetMet() {
    return this.retrieveLevel() >= this.target;
  }

  async setup() {}

  async perform() {
    await this.setup();
    // Runs until target is met
    while (!this.targetMet()) {
      await this.do();
      await this.player.checkStop();
    }

    this.player.stop();
  }

  static create(...args) {
    return new this(...args);
  }
}

class FactionAction extends Action {
  constructor(ns, player, factionTerm, target) {
    super(ns, player);

    this.faction = canonicalFaction(factionTerm);
    this.target = target;
  }

  async setup() {
    let factions = this.ns.checkFactionInvitations();
    for (let faction of factions) {
      if (CITIES.has(faction)) continue;
      this.ns.joinFaction(faction);
    }
  }

  async do() {
    await this.setup();
    await this.ns.workForFaction(this.faction, "hacking");
    await this.sleep(10000);
  }

  static create(ns, player, name, goalType, ...args) {
    let faction = canonicalFaction(name);
    if (!faction) throw new Error(`Bad faction name: ${name}`);

    if (goalType === "rep" || goalType === "r") {
      return new FactionRepAction(ns, player, faction, ...args);
    } else if (goalType === "favor" || goalType === "f") {
      return new FactionFavorAction(ns, player, faction, ...args);
    }
  }
}

class FactionRepAction extends FactionAction {
  retrieveLevel() {
    return this.ns.getFactionRep(this.faction);
  }

  info() {
    return `Faction Rep: Raise ${this.faction} rep to ${this.target}`;
  }
}

class FactionFavorAction extends FactionAction {
  retrieveLevel() {
    return (
      this.ns.getFactionFavor(this.faction) +
      this.ns.getFactionFavorGain(this.faction)
    );
  }

  info() {
    return `Faction Favor: Raise ${this.faction} favor to ${this.target}`;
  }
}

class CrimeAction extends Action {
  constructor(ns, player, crime = "homicide") {
    super(ns, player);
    this.crime = crime;
  }

  targetMet() {
    return false;
  }

  async do() {
    return this.player.commitCrime(this.crime);
  }

  info() {
    let chance = this.ns.getCrimeChance(this.crime);
    return `Commit crime ${
      this.crime
    } looped, success chance: ${convertToPercent(chance)}`;
  }

  static create(ns, player, crimeTerm = "homicide") {
    return new this(ns, player, canonicalCrime(crimeTerm));
  }
}

class StatTrain extends Action {
  constructor(ns, player, stat, target) {
    super(ns, player);

    if (stat === "all") {
      this.stats = [
        canonicalStat("hack"),
        canonicalStat("str"),
        canonicalStat("dex"),
        canonicalStat("def"),
        canonicalStat("agi"),
      ];
    } else if (stat === "phy" || stat === "combat" || stat === "physical") {
      this.stats = [
        canonicalStat("str"),
        canonicalStat("dex"),
        canonicalStat("def"),
        canonicalStat("agi"),
      ];
    } else {
      this.stats = [canonicalStat(stat)];
    }
    this.target = target;
  }

  targetMet() {
    for (let stat of this.stats) {
      if (this.player.getStat(stat) < this.target) return false;
    }

    return true;
  }

  async do() {
    for (let stat of this.stats) {
      await this.player.trainTo(stat, this.target);
    }
  }

  info() {
    return `Raise ${this.stats.join(", ")} to ${this.target}`;
  }
}

class CompanyAction extends Action {
  constructor(ns, player, company, target) {
    super(ns, player);
    this.company = company;
    this.target = target;
  }

  async setup() {
    let city = COMPANIES[this.company];
    this.player.travel(city);
  }

  async do() {
    while (this.ns.applyToCompany(this.company, "software"));

    await this.ns.workForCompany(this.company);
    await this.sleep(10000);
  }

  static create(ns, player, name, type, target) {
    let company = canonicalCompany(name);
    if (!company) throw new Error(`No company for ${name}`);

    if (type === "rep" || type === "r") {
      return new CompanyRepAction(ns, player, company, target);
    } else if (type === "favor" || type === "f") {
      return new CompanyFavorAction(ns, player, company, target);
    } else {
      throw new Error(`Unknown goal type: ${type} for ${company}`);
    }
  }
}

class CompanyFullAction extends CompanyAction {
  constructor(ns, player, company) {
    super(ns, player);
    this.company = company;
  }

  async perform() {
    while (this.ns.applyToCompany(this.company, "software"));
    await this.ns.workForCompany(this.company);
    await this.player.waitUntilNotBusy(30000);
  }

  info() {
    return `Full Shift at: ${this.company}`;
  }

  static create(ns, player, name) {
    let company = canonicalCompany(name);
    if (!company) throw new Error(`No company for ${name}`);

    return new this(ns, player, name);
  }
}

class CompanyRepAction extends CompanyAction {
  retrieveLevel() {
    return this.ns.getCompanyRep(this.company);
  }

  info() {
    return `Corp Rep: Working for ${this.company} goal ${this.target} reputation`;
  }
}

class CompanyFavorAction extends CompanyAction {
  retrieveLevel() {
    return (
      this.ns.getCompanyFavor(this.company) +
      this.ns.getCompanyFavorGain(this.company)
    );
  }

  info() {
    return `Corp Favor: Working for ${this.company} goal ${this.target} favor`;
  }
}

export let main = ThisScript.runner();

let ACTION_TYPES = {
  stat: StatTrain,
  faction: FactionAction,
  corp: CompanyAction,
  crime: CrimeAction,
  fullcorp: CompanyFullAction,
};
