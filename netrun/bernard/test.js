import * as TK from "./tk.js";

class TestScript extends TK.Script {
  async perform() {
    this.tlog(`Weakening...`);

    let server = this.server("comptek");
    await this.server("comptek").weaken(1);
  }
}

export let main = TestScript.runner();
