import {BaseScript, NSObject} from "./baseScript.js";
import Contract from "./contracts.js";
import {allServers} from "./traverse.js";

class ThisScript extends BaseScript {
  async perform() {
    this.disableLogging("scan");
    this.submit = this.pullFirstArg() === "submit" ? true : false;
    if (!this.submit) return this.runContracts();

    while (true) {
      await this.runContracts();
      await this.ns.sleep(10000);
    }
  }

  ls(server) {
    return this.ns.ls(server);
  }

  async runContracts() {
    let servers = await allServers("home", this.ns);

    for (let server of servers) {
      let files = this.ls(server).filter(name => name.endsWith(".cct"));
      if (files.length > 0) {
        let contract = new Contract(this.ns, files[0], server);

        this.log(
          `Found contract: ${contract.file} on ${server}, Tries: ${contract.triesLeft}`
        );

        // Allow text to print
        await this.sleep(100);

        // let shouldSolve = false;
        // if (
        //   contract.triesLeft === 10 ||
        //   contract.triesLeft === 1 ||
        //   contract.triesLeft === 5 ||
        //   contract.triesLeft === 15
        // ) {
        //   // This means we tried once and failed!
        //   shouldSolve = true;
        // }
        //
        // if (!shouldSolve) {
        //   continue;
        // }
        //
        if (contract.hasSolver()) {
          let success = await contract.solve(this.submit);
          if (!success) {
            this.tlog(`Bad solve for contract: ${contract.file} on ${server}`);
            await this.exit(`Stopping!`);
          }
        } else {
          this.tlog(`No solver for ${contract.type}`);
        }
      }
    }

    this.log(`Solved all contracts!`);
  }
}

export let main = ThisScript.runner();
