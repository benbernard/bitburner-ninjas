// This class must not have any ns calls in it (besides print and tprint), as
// its directly used by the minimal-* scripts.  Be careful not to add any
// methods that overlap NS.* names
export class NSObject {
  constructor(ns) {
    this.ns = ns;
    this.disabledLogs = {};
  }

  disableLogging(...names) {
    for (let name of names) {
      if (name in this.disabledLogs) continue;
      this.ns.disableLog(name);
    }
  }

  tlog(...msgs) {
    this.ns.tprint(msgs.join(" "));
  }

  log(...msgs) {
    this.ns.print(`${Date.now()}: ${msgs.join(" ")}`);
  }

  sleep(ms) {
    return this.ns.sleep(ms);
  }

  cFormat(money) {
    return this.ns.nFormat(money, "$0.0 a");
  }

  rFormat(ram) {
    return this.ns.nFormat(ram * (1024 * 1024 * 1024), "0b");
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
