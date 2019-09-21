import * as TK from "./tk.js";

class ThisScript extends TK.Script {
  async perform() {
    let [ram, name] = this.args;
    if (!name) {
      name = ram;
      ram = null;
    } else if (typeof name === "number") {
      [name, ram] = this.args;
    }

    if (!ram && !name) {
      this.listCosts();
    } else if (this.ns.serverExists(name)) {
      await this.deleteServer(name);
    } else {
      await this.purchse(ram, name);
    }
  }

  async deleteServer(name) {
    let [totalRam] = this.ns.getServerRam(name);
    let cost = this.cFormat(this.serverCost(totalRam));

    this.tlog(`Delete request for ${name}`);

    const processes = this.ns.ps(name);

    const approved = await this.ns.prompt(
      `DELETE SERVER REQUEST!  Delete ${name} costing ${cost}?  Currently running ${processes.length} processes.`
    );

    if (!approved) return this.exit(`Canceling`);

    await this.ns.killall(name);
    await this.ns.deleteServer(name);
    this.exit(`Deleted server ${name}`);
  }

  listCosts() {
    let purchased = this.ns.getPurchasedServers(true);
    this.tlog(
      `You have purchased ${
        purchased.length
      }/${this.ns.getPurchasedServerLimit()} servers`
    );
    this.tlog("");

    for (let i = 1; i <= 20; i++) {
      let ram = Math.pow(2, i);
      let cost = this.serverCost(ram);
      this.tlog(`  RAM ${ram} -- ${this.cFormat(cost)}`);
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
