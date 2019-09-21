import * as TK from "./tk.js";

class ThisScript extends TK.Script {
  async perform() {
    this.s = this.currentServer();

    let seen = {};
    let purchased = this.ns.getPurchasedServers();
    purchased.forEach(name => (seen[name] = 1));

    let mode = this.pullFirstArg() || "tree";

    if (mode === "tree") {
      await this.printTree(seen);
    } else if (mode === "sorted") {
      await this.sortedInfo(seen);
    } else {
      await this.exit(`Mode not recognized: ${mode}`);
    }
  }

  async sortedInfo(seen) {
    let servers = [];
    await this.s.traverse("", server => servers.push(server), seen);

    servers = servers.sort((a, b) => {
      let compVal = 0;

      if (compVal === 0) compVal = a.maxMoney() - b.maxMoney();
      if (compVal === 0) compVal = a.hackingLevel() - b.hackingLevel();

      return compVal;
    });

    if (this.pullFirstArg() === "limited") {
      let hackLevel = this.ns.getHackingLevel();
      servers = servers.filter(server => server.hackingLevel() <= hackLevel);
    }

    servers.forEach(server => this.tlog(server.info()));
  }

  async printTree(seen) {
    let printer = (server, indent) => {
      this.tlog(`${indent}${server.info()}`);
    };

    await this.s.traverse("", printer, seen);
  }
}

export let main = ThisScript.runner();
