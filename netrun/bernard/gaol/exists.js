import * as TK from "./tk.js";

class ThisScript extends TK.Script {
  async perform() {
    let server = this.pullFirstArg();
    this.tlog(`Sever ${server} exists: ${this.ns.serverExists(server)}`);
  }
}

export let main = ThisScript.runner();
