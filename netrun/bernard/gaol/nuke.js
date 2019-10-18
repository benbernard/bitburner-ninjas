import * as TK from "./tk.js";

class ThisScript extends TK.ServerScript {
  async perform() {
    await this.s.nuke();
    this.tlog(`Nuked ${this.serverName}`);
  }
}

export let main = ThisScript.runner();
