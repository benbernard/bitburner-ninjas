import {uuid, getCheapAssDocument} from "./utils.js";

// This class must not have any ns calls in it (besides print and tprint), as its directly used by the minimal-* scripts.  Be careful not to add any
// methods that overlap NS.* names
const USE_TPRINT_FOR_LOG = false;
// const USE_TPRINT_FOR_LOG = true;
// const CONSOLE_LOG = false;
const CONSOLE_LOG = true;

export class NSObject {
  constructor(ns) {
    if (!ns) throw new Error(`No ns object passed to NSOBject`);
    this.ns = ns;
    this.disabledLogs = {};
  }

  disableLogging(...names) {
    for (let name of names) {
      if (name in this.disabledLogs) continue;
      this.ns.disableLog(name);
    }
  }

  uuid() {
    return uuid();
  }

  tlog(...msgs) {
    this.ns.tprint(msgs.join(" "));
  }

  scriptName() {
    if (!this._scriptName) this._scriptName = this.ns.getScriptName();
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
    if (money === 0) return "$0";
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
  constructor(ns) {
    super(ns);
    this.originalArgs = [...this.ns.args];
  }

  get args() {
    return this.ns.args;
  }

  hasArg(term) {
    return this.ns.args.indexOf(term) !== -1;
  }

  pullFirstArg() {
    return this.ns.args.shift();
  }

  async perform() {
    this.ns.tprint("Subclass must implement2");
  }

  addFinally(fn) {
    if (!this.finalHandlers) this.finalHandlers = [];
    this.finalHandlers.push(fn);
  }

  async doFinally() {
    if (this.finally) await this.finally();
    if (!this.finalHandlers) return;

    for (let fn of this.finalHandlers) {
      await fn();
    }
  }

  addRemovingButton(name, fn) {
    let remove = this.addOptionButton(name, () => {
      remove();
      fn();
    });

    return remove;
  }

  addOptionButton(name, fn) {
    let doc = getCheapAssDocument();
    let id = `option-button-${name}`;
    if (doc.getElementById(id)) {
      doc.getElementById(id).remove();
    }

    let options = doc.getElementsByClassName("character-quick-options")[0];
    let button = doc.createElement("button");

    button.id = id;
    button.className = "character-overview-btn";
    button.style = "margin-top: 5px;";

    button.innerText = name;
    button.addEventListener("click", () => {
      fn();
    });

    options.appendChild(button);

    let remove = () => {
      button.remove();
    };

    this.addFinally(remove);
    return remove;
  }

  static runner() {
    let self = this;
    return async function (ns) {
      let inst = new self(ns);
      try {
        await inst.perform();
      } finally {
        await inst.doFinally();
      }
    };
  }
}

// Also export as non-default
export {BaseScript};
