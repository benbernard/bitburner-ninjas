import * as TK from "./tk.js";
import {purchasedSet} from "./purchased.js";

class ThisScript extends TK.Script {
  async perform() {
    let servers = await this.currentServer().reachableServers(
      purchasedSet(this.ns)
    );

    for (let server of servers) {
      let files = server.ls().filter(name => name.endsWith(".cct"));
      if (files.length) {
        this.tlog(
          `Found Contracts on ${server.name}: ${files.join(
            " "
          )} Path: ${server.path()}`
        );
      }
    }
  }
}

export let main = ThisScript.runner();
