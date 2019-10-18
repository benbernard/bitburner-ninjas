import * as TK from "./tk.js";
import {purchasedSet} from "./purchased.js";

class ThisScript extends TK.Script {
  async perform() {
    let servers = await this.currentServer().reachableServers(
      purchasedSet(this.ns)
    );

    for (let server of servers) {
      this.tlog(`Hacking ${server.name}`);
      await server.nuke();
    }
  }
}

export let main = ThisScript.runner();
