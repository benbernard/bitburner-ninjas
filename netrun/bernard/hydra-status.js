import * as TK from "./tk.js";

const STATUS_FILE = "hydra-status.txt";

class ThisScript extends TK.Script {
  async perform() {
    let contents = this.ns.read(STATUS_FILE, "home");
    let statusInfo = JSON.parse(contents);

    let machines = this.args;
    if (!machines) {
      await this.exit(`Must specify machines`);
      return;
    }

    for (let machine of machines) {
      let infoStr = "";
      if (machine in statusInfo) {
        infoStr = JSON.stringify(statusInfo[machine]);
      } else {
        infoStr = `No Status found!`;
      }

      this.tlog(`  ${machine}: ${infoStr}`);
    }
  }
}

export let main = ThisScript.runner();
