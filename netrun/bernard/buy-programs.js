import BaseScript from "./baseScript.js";

let programs = [
  "BruteSSH.exe",
  "FTPCrack.exe",
  "SQLInject.exe",
  "relaySMTP.exe",
  "HTTPWorm.exe",
];

class ThisScript extends BaseScript {
  async perform() {
    while (!this.allProgramsBought({log: false})) {
      let info = this.ns.getCharacterInformation();
      if (!info.tor) {
        this.ns.purchaseTor();
      }

      for (let program of programs) {
        this.buyProgram(program);
      }

      if (this.allProgramsBought()) break;
      await this.sleep(1000);
    }
  }

  allProgramsBought({log = true} = {}) {
    for (let program of programs) {
      if (!this.ns.fileExists(program, "home")) return false;
    }

    if (log) this.tlog("Bought all nuke porgrams!");
    return true;
  }

  buyProgram(program) {
    if (this.ns.fileExists(program, "home")) return;
    let success = this.ns.purchaseProgram(program);
    if (success) this.tlog(`Bought ${program}`);
  }
}

export let main = ThisScript.runner();
