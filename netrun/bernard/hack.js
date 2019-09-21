import * as TK from "./tk.js";

class ThisScript extends TK.ServerScript {
  async perform() {
    const thisServer = this.currentServer();
    const targetServer = this.serverName;

    while (true) {
      await thisServer.weaken(targetServer);
      await thisServer.grow(targetServer);

      await thisServer.weaken(targetServer);
      await thisServer.maxHack(targetServer);
    }
  }
}

export let main = ThisScript.runner();
