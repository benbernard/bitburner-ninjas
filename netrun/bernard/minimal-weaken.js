import BaseScript from "./baseScript.js";

class ThisScript extends BaseScript {
  async perform() {
    let server = this.pullFirstArg();

    this.log(`Weakening ${server}`);
    await this.ns.weaken(server);
  }
}

export let main = ThisScript.runner();
