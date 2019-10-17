import BaseScript from "./baseScript.js";

class ThisScript extends BaseScript {
  async perform() {
    try {
      this.ns.isRunning("minimal-grow.js", "hydra-ben", "foodnstuff");
    } catch (e) {
      debugger;
      this.tlog(`caught error: ${e.message}`);
      throw e;
    }
  }
}

export let main = ThisScript.runner();
