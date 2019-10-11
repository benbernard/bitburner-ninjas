import BaseScript from "./baseScript.js";

let scripts = [
  "hydra-hack.js",
  "bank.js",
  "maintain-servers.js",
  "scheduled-cct.js",
  "buy-programs.js",
  // 'manage-gang.js',
];

class ThisScript extends BaseScript {
  async perform() {
    for (let script of scripts) {
      if (!this.ns.scriptRunning(script, this.ns.getHostname())) continue;
      this.ns.run(script);
    }
  }
}

export let main = ThisScript.runner();
