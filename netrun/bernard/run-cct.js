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
        this.log(
          `Found contract: ${contract.file} on ${server.name}, Tries: ${contract.triesLeft}`
        );
        this.log(`Type: "${contract.type}"`);
        this.log(`Description: ${contract.description}`);
        this.log(`Data: ${JSON.stringify(contract.data)}`);

        // Allow text to print
        await this.ns.sleep(100);

        let shouldSolve = false;
        if (contract.triesLeft === 10 || contract.triesLeft === 1) {
          // This means we tried once and failed!
          shouldSolve = true;
        }

        if (!shouldSolve) {
          continue;
        }

        if (contract.hasSolver()) {
          let success = await contract.solve(submit);
          if (!success) {
            await this.exit(`Stopping!`);
          }
        } else {
          this.log(`No solver for ${contract.type}`);
        }
      }
    }

    this.log(`Solved all contracts!`);
  }
}

export let main = ThisScript.runner();
