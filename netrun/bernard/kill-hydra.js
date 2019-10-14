import * as TK from "./tk.js";

class ThisScript extends TK.ServerScript {
  async perform() {
    let servers = await this.s.reachableServers({}, true);

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
