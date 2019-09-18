import * as TK from "./tk.js";

class ThisScript extends TK.ServerScript {
  async run() {
    while (true) {
      await this.s.weaken();
      await this.s.grow();

      await this.s.weaken();
      await this.s.hack();
    }
  }
}

export let main = ThisScript.runner();
