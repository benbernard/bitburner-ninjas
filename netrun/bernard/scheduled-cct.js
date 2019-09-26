import * as TK from "./tk.js";

class ThisScript extends TK.Script {
  async perform() {
    let server = this.currentServer();
    while (true) {
      await server.awaitRun("run-cct.js", 1, "submit");
      await this.sleep(10000);
    }
  }
}

export let main = ThisScript.runner();
