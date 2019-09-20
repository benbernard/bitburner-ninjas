import * as TK from "./tk.js";

class ThisScript extends TK.Script {
  async perform() {
    let ram = this.args.shift();
    let name = this.args.shift();
    if (!ram) {
      this.listCosts();
    } else {
      await this.purchse(ram, name);
    }
  }

  listCosts() {
    for (let i = 1; i <= 20; i++) {
      let ram = Math.pow(2, i);
      let cost = this.serverCost(ram);
      this.tlog(` RAM ${ram} -- ${this.cFormat(cost)}`);
    }
  }

  serverCost(ram) {
    return this.ns.getPurchasedServerCost(ram);
  }

  async purchse(ram, name) {
    let cost = this.cFormat(this.serverCost(ram));

    if (!ram || !name) {
      await this.exit(`Must specify ram and name!`);
    }

    let buy = await this.ns.prompt(
      `Purchase ${name} server with ${ram} ram for ${cost}`
    );
    if (buy) {
      this.tlog(`Buying ${name}`);
      let success = await this.ns.purchaseServer(name, ram);

      if (success) {
        this.ns.tprint("Successful!");
      } else {
        this.ns.tprint("Failed!");
      }
    }
  }
}

export let main = ThisScript.runner();
