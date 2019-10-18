import {Player} from "./singularity.js";

Player.prototype.ownedAugments = function () {
  return this.ns.getOwnedAugmentations(true);
};
