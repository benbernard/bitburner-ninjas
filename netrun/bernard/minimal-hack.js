import BaseScript from "./baseScript.js";

class ThisScript extends BaseScript {
  async perform() {
    let server = this.pullFirstArg();
    let stock = this.pullFirstArg() === "1" ? true : false;

    // this.log(`Hacking ${server}, stock: ${stock}`);
    await this.ns.hack(server, {stock});

    // this.tlog(
    //   [
    //     `Available money: ${this.cFormat(
    //       this.ns.getServerMoneyAvailable(server)
    //     )}`,
    //     `Available home money: ${this.ns.getServerMoneyAvailable("home")}`,
    //     `Hack: ${this.ns.getHackingLevel()}`,
    //   ].join(" ")
    // );
  }
}

export let main = ThisScript.runner();
