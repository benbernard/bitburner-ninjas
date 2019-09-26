import * as TK from "./tk.js";

class ThisScript extends TK.ServerScript {
  async perform() {
    let servers = await this.s.reachableServers({}, true);

    let home = servers.find(s => s.name === "home");
    servers = servers.filter(s => s.name !== "home");

    for (let server of servers) {
      let processes = server.ps();

      for (let info of processes) {
        this.tlog(`Killl ${info.filename} on ${server.name}`);
      }

      await server.killall();
    }

    await home.killall();
  }
}

export let main = ThisScript.runner();
