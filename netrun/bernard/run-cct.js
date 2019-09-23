import * as TK from "./tk.js";
import Contract from "./contracts.js";
import {purchasedSet} from "./purchased.js";

class ThisScript extends TK.Script {
  async perform() {
    let submit = this.pullFirstArg() === "submit" ? true : false;
    let servers = await this.currentServer().reachableServers(
      purchasedSet(this.ns)
    );

    for (let server of servers) {
      let files = server.ls().filter(name => name.endsWith(".cct"));
      if (files.length > 0) {
        let contract = new Contract(files[0], server);
        this.tlog(
          `Found contract: ${contract.file} on ${server.name}, Tries: ${contract.triesLeft}`
        );
        this.tlog(`Type: "${contract.type}"`);
        this.tlog(`Description: ${contract.description}`);
        this.tlog(`Data: ${JSON.stringify(contract.data)}`);

        // Allow text to print
        await this.ns.sleep(200);

        if (contract.hasSolver()) {
          let success = await contract.solve(submit);
          if (!success) {
            await this.exit(`Stopping!`);
          }
        } else {
          this.tlog(`No solver for ${contract.type}`);
        }
      }
    }

    this.tlog(`Solved all contracts!`);
  }
}

export let main = ThisScript.runner();
