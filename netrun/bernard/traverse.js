import {NSObject} from "./baseScript.js";

class Visitor extends NSObject {
  constructor(ns, visitor, seen = {}) {
    super(ns);

    this.visitor = visitor;
    this.seen = seen;
  }

  async traverse(server, level = 0) {
    this.seen[server] = 1;
    let children = await this.ns.scan(server);
    children = children.filter(name => !this.seen[name]);

    for (let child of children) {
      await this.visitor(child, level);
      this.seen[child] = 1;
      await this.traverse(child, level + 1);
    }
  }
}

export default async function traverse(server, ns, fn, seen = {}) {
  let visitor = new Visitor(ns, fn, seen);
  return visitor.traverse(server);
}

export async function allServers(server, ns, seen = {}) {
  let servers = [server];

  let visitor = new Visitor(ns, s => servers.push(s), seen);
  await visitor.traverse(server);

  return servers;
}
