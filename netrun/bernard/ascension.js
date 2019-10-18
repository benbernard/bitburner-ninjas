import * as TK from "./tk.js";
import * as constants from "./gameConstants.js";
import * as singularityAugments from "./singularityAugments.js";

import {NSObject} from "./baseScript.js";
import {Player} from "./singularity.js";

let goals = [["s:hack:20"]];

class ThisScript extends TK.Script {
  async perform() {
    this.player = new Player(this.ns);
  }
}

class FactionGoal extends NSObject {
  constructor(ns, player, faction, augmentNames) {
    super(ns);
    this.player = player;
    this.faction = faction;

    let ownedSet = new Set(this.player.ownedAugments());
    this.augments = augmentNames
      .map(name => constants.AUGMENTS[name])
      .filter(aug => !ownedSet.has(aug.name));
  }

  hasAugments() {
    return this.augments.length > 0;
  }

  repNeeded() {
    return this.augments.reduce((sum, aug) => sum + aug.rep, 0);
  }

  cost() {
    return this.augments.reduce((sum, aug) => sum + aug.cost, 0);
  }
}

export let main = ThisScript.runner();
