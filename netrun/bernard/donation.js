import * as TK from "./tk.js";

class ThisScript extends TK.Script {
  async perform() {
    this.tlog(`Favor To Donate: ${this.ns.getFavorToDonate()}`);
  }
}

export let main = ThisScript.runner();
