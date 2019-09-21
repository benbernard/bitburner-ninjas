// This class must not have any ns calls in it (besides print and tprint), as
// its directly used by the minimal-* scripts.  Be careful not to add any
// methods that overlap NS.* names
export class NSObject {
  constructor(ns) {
    this.ns = ns;
  }

  tlog(msg) {
    this.ns.tprint(msg);
  }

  log(msg) {
    this.ns.print(msg);
  }

  cFormat(money) {
    return this.ns.nFormat(money, "$0.0 a");
  }

  async exit(msg) {
    if (msg) this.tlog(msg);
    await this.ns.exit();
  }
}

export default class BaseScript extends NSObject {
  get args() {
    return this.ns.args;
  }

  pullFirstArg() {
    return this.ns.args.shift();
  }

  async perform() {
    this.ns.tprint("Subclass must implement2");
  }

  static runner() {
    let self = this;
    return async function (ns) {
      let inst = new self(ns);
      await inst.perform();
    };
  }
}

// Also export as non-default
export {BaseScript};
