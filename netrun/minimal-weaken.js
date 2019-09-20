import BaseScript from "./baseScript.js";

class ThisScript extends BaseScript {
  async perform() {
    let server = this.pullFirstArg();
    await this.ns.weaken(server);
  }
}

export let main = ThisScript.runner();
