import BaseScript from "./baseScript.js";

class ThisScript extends BaseScript {
  async perform() {
    let server = this.pullFirstArg();
    let stock = this.pullFirstArg() === "1" ? true : false;

    this.log(`Hacking ${server}, stock: ${stock}`);
    await this.ns.hack(server, {stock});
  }
}

export let main = ThisScript.runner();
