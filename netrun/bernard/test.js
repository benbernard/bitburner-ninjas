import * as TK from "./tk.js";

class TestScript extends TK.Script {
  async perform() {
    await this.tlog(this.server("home").ramInfo());
  }
}

export let main = TestScript.runner();
