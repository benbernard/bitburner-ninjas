import * as TK from "./tk.js";
import {
  CITIES,
  COMPANIES,
  CRIMES,
  FACTIONS,
  Player,
  STAT_MAP,
} from "./singularity.js";
import {NSObject} from "./baseScript.js";

class ThisScript extends TK.Script {
  get player() {
    return new Player(this.ns);
  }

  async perform() {
    let actions = this.makeActions(this.args);
    await this.player.initPlayerLoop();

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

    for (let action of actions) {
      this.tlog(`Running ${action.info()}`);
      await action.run();
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

      return ACTION_TYPES[canonicalAction].create(this.ns, ...args);
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
  targetMet() {
    return this.retrieveLevel() >= this.target;
  }

  get player() {
    if (!this._player) this._player = new Player(this.ns);
    return this._player;
  }

  async setup() {}

  async run() {
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
  constructor(ns, factionTerm, target) {
    super(ns);

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
    await this.ns.workForFaction(this.faction, "hacking");
    await this.sleep(10000);
  }

  static create(ns, name, goalType, ...args) {
    let faction = canonicalFaction(name);
    if (!faction) throw new Error(`Bad faction name: ${name}`);

    if (goalType === "rep" || goalType === "r") {
      return new FactionRepAction(ns, faction, ...args);
    } else if (goalType === "favor" || goalType === "f") {
      return new FactionFavorAction(ns, faction, ...args);
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
  constructor(ns, crime = "homicide") {
    super(ns);
    this.crime = crime;
  }

  targetMet() {
    return false;
  }

  async do() {
    return this.player.commitCrime(this.crime);
  }

  info() {
    return `Commit crime ${this.crime} looped`;
  }

  static create(ns, crimeTerm = "homicide") {
    return new this(ns, canonicalCrime(crimeTerm));
  }
}

class StatTrain extends Action {
  constructor(ns, stat, target) {
    super(ns);

    this.stat = stat;
    this.target = target;
  }

  retrieveLevel() {
    return this.player.getStat(this.stat);
  }

  do() {
    return this.player.trainTo(this.stat, this.target);
  }

  info() {
    return `Raise ${this.stat} to ${this.target}`;
  }
}

class CompanyAction extends Action {
  constructor(ns, company, target) {
    super(ns);
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

  static create(ns, name, type, target) {
    let company = canonicalCompany(name);
    if (!company) throw new Error(`No company for ${name}`);

    if (type === "rep" || type === "r") {
      return new CompanyRepAction(ns, company, target);
    } else if (type === "favor" || type === "f") {
      return new CompanyFavorAction(ns, company, target);
    } else {
      throw new Error(`Unknown goal type: ${type} for ${company}`);
    }
  }
}

class CompanyFullAction extends CompanyAction {
  constructor(ns, company) {
    super(ns);
    this.company = company;
  }

  async run() {
    while (this.ns.applyToCompany(this.company, "software"));
    await this.ns.workForCompany(this.company);
    await this.player.waitUntilNotBusy(30000);
  }

  info() {
    return `Full Shift at: ${this.company}`;
  }

  static create(ns, name) {
    let company = canonicalCompany(name);
    if (!company) throw new Error(`No company for ${name}`);

    return new this(ns, name);
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

let validStats = new Set(Object.keys(STAT_MAP));

function matcher(term, set) {
  if (set.has(term)) return term;

  for (let item of set) {
    if (item.toLowerCase().startsWith(term.toLowerCase())) return item;
  }

  let regex = new RegExp(term);
  for (let item of set) {
    if (item.match(regex)) return item;
  }

  for (let item of set) {
    if (item.toLowerCase().match(regex)) return item;
  }
}

function canonicalCompany(term) {
  return matcher(term, new Set(Object.keys(COMPANIES)));
}

function canonicalFaction(term) {
  return matcher(term, FACTIONS);
}

function canonicalCrime(term) {
  return matcher(term, CRIMES);
}

let ACTION_TYPES = {
  stat: StatTrain,
  faction: FactionAction,
  corp: CompanyAction,
  crime: CrimeAction,
  fullcorp: CompanyFullAction,
};
