// This class must not have any ns calls in it (besides print and tprint), as
// its directly used by the minimal-* scripts.  Be careful not to add any
// methods that overlap NS.* names
const USE_TPRINT_FOR_LOG = false;
// const USE_TPRINT_FOR_LOG = true;
// const CONSOLE_LOG = false;
const CONSOLE_LOG = true;

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

  scriptName() {
    return this.ns.getScriptName();
  }

  log(...msgs) {
    const msg = `${this.scriptName()}:${this.logDate()}: ${msgs.join(" ")}`;

    if (USE_TPRINT_FOR_LOG) {
      this.tlog(msg);
    } else {
      this.ns.print(msg);
    }

    if (CONSOLE_LOG) console.log(msg);
  }

  logDate() {
    let currentDate = new Date();

    let year = currentDate.getFullYear();
    let month = currentDate.getMonth() + 1;
    let day = currentDate.getDate();

    let hours = currentDate.getHours();
    let minutes = currentDate.getMinutes();

    return `${year}-${month}-${day} ${hours}:${minutes}`;
  }

  sleep(ms) {
    return this.ns.sleep(ms);
  }

  nFormat(number) {
    return this.ns.nFormat(number, "0.0a");
  }

  cFormat(money) {
    return this.ns.nFormat(money, "$0.0 a");
  }

  rFormat(ram) {
    return this.ns.nFormat(ram * (1024 * 1024 * 1024), "0ib");
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
