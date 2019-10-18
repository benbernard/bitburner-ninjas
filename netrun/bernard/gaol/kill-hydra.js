import * as TK from "./tk.js";

class ThisScript extends TK.ServerScript {
  async perform() {
    await this.killHydra();

    // Due to spawing rules, things may not have spawned by the time we are here, so sleep
    await this.sleep(100);
    await this.killHydra();
    await this.sleep(100);
    await this.killHydra();
  }

  async killHydra() {
    let servers = await this.s.reachableServers({}, true);

    this.kill("home");

    await this.sleep(100);

    this.kill("home");

    for (let server of servers) {
      this.kill(server.name);
    }
  }

  kill(name) {
    this.ns.scriptKill("hydra-hack.js", name);
    this.ns.scriptKill("minimal-hack.js", name);
    this.ns.scriptKill("minimal-grow.js", name);
    this.ns.scriptKill("minimal-weaken.js", name);
    this.ns.scriptKill("looped-weaken.js", name);
  }
}

export let main = ThisScript.runner();
