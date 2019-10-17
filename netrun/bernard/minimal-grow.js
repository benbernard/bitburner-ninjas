import BaseScript from "./baseScript.js";

class ThisScript extends BaseScript {
  async perform() {
    let server = this.pullFirstArg();
    let stock = this.pullFirstArg() === "1" ? true : false;

    // this.log(`Growing ${server}, stock: ${stock}`);
    await this.ns.grow(server, {stock});

    // this.tlog(
    //   `Available money: ${this.cFormat(
    //     this.ns.getServerMoneyAvailable(server)
    //   )}`
    // );
  }
}

export let main = ThisScript.runner();
