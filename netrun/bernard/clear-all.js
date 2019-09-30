import * as TK from "./tk.js";

class ThisScript extends TK.Script {
  async perform() {
    let servers = await this.home.reachableServers({});

    for (let server of servers) {
      if (server.name === "home") continue;

      let files = server.ls().filter(name => name.endsWith(".js"));
      this.tlog(`${server.name} - Removing ${files.join(", ")}`);

      files.forEach(f => server.rm(f));
    }
  }
}

export let main = ThisScript.runner();
