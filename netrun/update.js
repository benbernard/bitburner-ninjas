import * as TK from "./tk.js";

class ThisScript extends TK.Script {
  async perform() {
    this.ns.tprint(`Done updating!`);
    await this.ns.exit();
  }
}

export let main = ThisScript.runner();
