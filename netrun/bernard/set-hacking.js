import * as TK from "./tk.js";
import {_} from "./utils.js";

class ThisScript extends TK.Script {
  async perform() {
    let name = this.pullFirstArg();
    if (name == null || name === "home") {
      throw new Error(`Must speicfy a server other than home`);
    }

    if (_.isNumber(name)) {
      name = `hacknet-node-${name}`;
    }

    this.tlog(`Setting ${name} to hacking`);
    this.server(name).setUseForHacking();
  }
}

export let main = ThisScript.runner();
