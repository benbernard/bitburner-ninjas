import * as constants from "./gameConstants.js";

let augments = constants.augments().filter(a => a.isHacking());

let factions = {};
function addAugToFaction(aug, faction) {
  if (!(faction in factions)) factions[faction] = [];
  factions[faction].push(aug);
}

function addAug(aug) {
  for (let faction of aug.factions()) {
    addAugToFaction(aug, faction);
  }
}

augments.forEach(addAug);

// Object.keys(factions)
//   .sort((a, b) => {
//     let aRep = factions[a].reduce((sum, a) => a.rep + sum, 0);
//     let bRep = factions[b].reduce((sum, b) => b.rep + sum, 0);
//
//     return aRep - bRep;
//   })
//   .forEach(f => {
//     console.log(`${f} = ${factions[f].map(a => a.name).join(", ")}`);
//   });

let repNeeded = factions["CyberSec"].reduce((sum, a) => sum + a.rep, 0);
console.log(`Rep needed: ${repNeeded}`);
console.log(JSON.stringify(factions["CyberSec"].map(a => a.name), null, 2));
