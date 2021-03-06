import BaseScript from "./baseScript.js";

let scripts = [
  ["bank.js"],
  ["buy-programs.js"],
  ["run-cct.js", "submit"],
  ["hacknet-manager.js"],
  ["maintain-servers.js"],
  ["hydra-hack.js"],
  ["manage-gang.js"],
];

class ThisScript extends BaseScript {
  async perform() {
    let hostname = this.ns.getHostname();
    for (let [script, ...args] of scripts) {
      if (this.ns.scriptRunning(script, hostname)) continue;
      this.tlog(`Starting ${script}`);
      let pid = await this.ns.exec(script, hostname, 1, ...args);
      if (pid === 0) {
        this.tlog(`Could not start ${script}`);
      }

      if (script === "bank.js") {
        await this.sleep(200);
      }
    }
  }
}

export let main = ThisScript.runner();
