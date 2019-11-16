import * as TK from "./tk.js";
import {FACTIONS} from "./gameConstants.js";
import {Player} from "./singularity.js";
import {json} from "./utils.js";

let BREAK_IT_SCRIPT = "break-it-impl.js";
let logFile = "break-it-log.txt";

class ThisScript extends TK.Script {
  async perform() {
    this.ns.rm(logFile);

    let dryRun = this.pullFirstArg() !== "submit";

    let args = [];
    if (dryRun) {
      this.tlog(`Doing dryrun`);
      args.push("--dryrun");
    } else {
      let confirmed = await this.ns.prompt(`Perform break it for real?`);
      if (!confirmed) {
        this.exit(`Ending`);
        return;
      }
    }

    this.home.exec(BREAK_IT_SCRIPT, 1, ...args);
    await this.sleep(100);
  }
}

export let main = ThisScript.runner();
