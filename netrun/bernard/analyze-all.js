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
    } else if (mode === "search") {
      await this.serverSearch(this.args[0], seen);
    } else if (mode === "rooted") {
      await this.rooted(seen);
    } else {
      await this.exit(`Mode not recognized: ${mode}`);
    }
  }

  async serverSearch(term, seen) {
    let servers = [];
    await this.s.traverse(server => servers.push(server), seen);

    servers = servers.filter(s => s.name.startsWith(term));

    if (servers.length > 1) {
      servers.forEach(s => {
        this.tlog(s.info(true, {asConnect: true}));
      });
    } else if (servers.length === 1) {
      let server = servers[0];
      this.tlog(server.info(true, {asConnect: true}));
      server.copyConnectionPath();
    } else {
      this.tlog(`No matching servers for ${term}`);
    }
  }

  async rooted(seen) {
    let servers = await this.s.reachableServers(seen);

    servers.filter(s => s.hasRoot()).forEach(s => this.tlog(s.info()));
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
    let printer = (server, level) => {
      this.tlog(`${" ".repeat(level)}${server.info()}`);
    };

    await this.s.traverse(printer, seen);
  }
}

export let main = ThisScript.runner();
