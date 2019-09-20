// This class must not have any ns calls in it, as its directly used by the
// minimal-* scripts
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
}

export class BaseScript extends NSObject {
  get args() {
    return this.ns.args;
  }

  async perform() {
    this.ns.tprint("Subclass must implement2");
  }

  tlog(msg) {
    this.ns.tprint(msg);
  }

  log(msg) {
    this.ns.print(msg);
  }

  static runner() {
    let self = this;
    return async function (ns) {
      let inst = new self(ns);
      await inst.perform();
    };
  }
}
