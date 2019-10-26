import * as TK from "./tk.js";

class ThisScript extends TK.ServerScript {
  async perform() {
    let servers = await this.s.reachableServers({}, true);

    let home = servers.find(s => s.name === "home");
    servers = servers.filter(s => s.name !== "home");

    for (let server of [...servers, home]) {
      let processes = server.ps();

      for (let info of processes) {
        if (info.filename === this.scriptName() && server.name === "home")
          continue;
        this.tlog(`Killing ${info.filename} on ${server.name}`);
      }

      await server.killall();
    }
  }
}

export let main = ThisScript.runner();
