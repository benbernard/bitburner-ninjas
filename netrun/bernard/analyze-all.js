import * as TK from "./tk.js";
import {purchasedSet} from "./purchased.js";

class ThisScript extends TK.Script {
  async perform() {
    this.s = this.currentServer();
    let seen = purchasedSet(this.ns);

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
    await this.s.traverse(server => servers.push(server), seen);

    let type = this.pullFirstArg() || "money";

    servers = servers.sort((a, b) => {
      let compVal = 0;

      if (type === "money" || type === "limited") {
        if (compVal === 0) compVal = a.maxMoney() - b.maxMoney();
        if (compVal === 0) compVal = a.hackingLevel() - b.hackingLevel();
      } else if (type === "hack") {
        if (compVal === 0) compVal = a.hackingLevel() - b.hackingLevel();
        if (compVal === 0) compVal = a.maxMoney() - b.maxMoney();
      }

      return compVal;
    });

    if (type === "limited") {
      let hackLevel = this.ns.getHackingLevel();
      servers = servers.filter(server => server.hackingLevel() <= hackLevel);
    }

    servers.forEach(server => this.tlog(server.info()));
  }

  async printTree(seen) {
    let printer = (server, indent) => {
      this.tlog(`${indent}${server.info()}`);
    };

    await this.s.traverse(printer, seen);
  }
}

export let main = ThisScript.runner();
