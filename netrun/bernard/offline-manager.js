import * as TK from "./tk.js";
import {Player, STAT_MAP} from "./singularity.js";
import {NSObject} from "./baseScript.js";

class ThisScript extends TK.Script {
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

    for (let action of actions) {
      this.tlog(`Running ${action.info()}`);
      await action.run();
    }
  }

  makeActions(actions) {
    return actions.map(spec => {
      let [type, ...args] = spec.split(":");

      let faction = canonicalFaction(type);
      if (validStats.has(type)) {
        return new StatTrain(this.ns, type, ...args);
      } else if (faction) {
        let [goalType, target] = args;
        if (goalType === "rep") {
          return new FactionRepAction(this.ns, faction, target);
        } else if (goalType === "favor") {
          return new FactionFavorAction(this.ns, faction, target);
        } else {
          throw new Error(`Bad faction goal type: ${goalType}`);
        }
      } else if (type === "crime") {
        return new CrimeAction(this.ns);
      } else {
        throw new Error(`Bad action: ${type}`);
      }
    });
  }
}

class Action extends NSObject {
  targetMet() {
    return this.retrieveLevel() > this.target;
  }

  get player() {
    if (!this._player) this._player = new Player(this.ns);
    return this._player;
  }

  async run() {
    // Runs until target is met
    while (!this.targetMet()) {
      await this.do();
      await this.player.checkStop();
    }

    this.player.stop();
  }
}

class FactionAction extends Action {
  constructor(ns, factionTerm, target) {
    super(ns);

    this.faction = canonicalFaction(factionTerm);
    this.target = target;
  }

  async do() {
    await this.ns.workForFaction(this.faction, "hacking");
    await this.sleep(1000);
  }
}

class FactionRepAction extends FactionAction {
  retrieveLevel() {
    return this.ns.getFactionRep(this.faction);
  }

  info() {
    return `Raise ${this.faction} rep to ${this.target}`;
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
    return `Raise ${this.faction} favor to ${this.target}`;
  }
}

class CrimeAction extends Action {
  targetMet() {
    return false;
  }

  async do() {
    return this.player.commitCrime("homicide");
  }

  info() {
    return `Commit crime looped`;
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

export let main = ThisScript.runner();

const validFactions = new Set([
  "Illuminati",
  "Daedalus",
  "The Covenant",
  "ECorp",
  "MegaCorp",
  "Bachman & Associates",
  "Blade Industries",
  "NWO",
  "Clarke Incorporated",
  "OmniTek Incorporated",
  "Four Sigma",
  "KuaiGong International",
  "Fulcrum Secret Technologies",
  "BitRunners",
  "The Black Hand",
  "NiteSec",
  "Aevum",
  "Chongqing",
  "Ishima",
  "New Tokyo",
  "Sector-12",
  "Volhaven",
  "Speakers for the Dead",
  "The Dark Army",
  "The Syndicate",
  "Silhouette",
  "Tetrads",
  "Slum Snakes",
  "Netburners",
  "Tian Di Hui",
  "CyberSec",
  "Bladeburners",
]);

function canonicalFaction(term) {
  if (validFactions.has(term)) return term;
  let regex = new RegExp(term);

  for (let faction of validFactions) {
    if (faction.match(regex)) return faction;
  }

  for (let faction of validFactions) {
    if (faction.toLowerCase().match(regex)) return faction;
  }

  return undefined;
}

let validStats = new Set(Object.keys(STAT_MAP));
