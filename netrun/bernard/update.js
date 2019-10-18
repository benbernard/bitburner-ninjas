import {BaseScript, NSObject} from "./baseScript.js";

class ThisScript extends BaseScript {
  async perform() {
    this.ns.tprint(`Done updating!`);
    await this.ns.exit();
  }
}

export let main = ThisScript.runner();
