import * as TK from "./tk.js";

class ThisScript extends TK.ServerScript {
  async perform() {
    await this.killHacks();

    // Due to spawing rules, things may not have spawned by the time we are here, so sleep
    this.tlog(`Waiting 1s`);
    await this.sleep(1000);
    await this.killHacks();

    this.tlog(`Waiting 1s`);
    await this.sleep(1000);
    await this.killHacks();

    this.tlog("Done Killing");
  }

  async killHacks() {
    let servers = await this.s.reachableServers({}, true);

    this.tlog("Killing all hacks");

    this.kill("home");

    await this.sleep(100);

    this.kill("home");

    for (let server of servers) {
      this.kill(server.name);
      await this.sleep(1);
    }
  }

  kill(name) {
    this.ns.scriptKill("hurricane.js", name);
    this.ns.scriptKill("hydra-hack.js", name);
    this.ns.scriptKill("firegale.js", name);
    this.ns.scriptKill("firestorm.js", name);
    this.ns.scriptKill("minimal-hack.js", name);
    this.ns.scriptKill("minimal-grow.js", name);
    this.ns.scriptKill("minimal-weaken.js", name);
    this.ns.scriptKill("looped-weaken.js", name);
    this.ns.scriptKill("hackd.js", name);
  }
}

export let main = ThisScript.runner();
