import * as TK from "./tk.js";

const STATUS_FILE = "hydra-status.txt";

class ThisScript extends TK.Script {
  async perform() {
    let contents = this.ns.read(STATUS_FILE, "home");
    this.tlog(JSON.stringify(JSON.parse(contents), null4));
    console.log(JSON.stringify(JSON.parse(contents), 4));
  }
}

export let main = ThisScript.runner();
