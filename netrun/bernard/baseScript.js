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
    let doc = getDocument();
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

export function convertStrToMoney(str) {
  if (typeof str === "number" || str.match(/^\d+$/)) return parseInt(str);

  let unit = str[str.length - 1];
  let amount = parseInt(str.substring(0, str.length - 1));
  if (!(unit in CONVERSIONS)) {
    throw new Error(
      `Cannot find unit ${unit} in ${JSON.stringify(Object.keys(CONVERSIONS))}`
    );
  }

  return amount * CONVERSIONS[unit];
}

let CONVERSIONS = {
  t: "1000000000000",
  b: "1000000000",
  m: "1000000",
  k: "1000",
};

export function getDocument() {
  // eslint-disable-next-line no-eval
  return eval("document");
}

export function convertToPercent(num) {
  let converted = round2(num * 100);
  return `${converted}%`;
}

export function round2(num) {
  return Math.floor(num * 100) / 100;
}

export function json(...args) {
  return JSON.stringify(...args);
}

export async function copy(text) {
  let result = await navigator.permissions.query({name: "clipboard-write"});
  if (result.state !== "granted")
    throw new Error("No Permission for clipboard: ${result.state}");

  await navigator.clipboard.writeText(text);
}

export let _ = {
  isFunction(val) {
    return typeof val === "function";
  },

  constant(val) {
    return () => val;
  },

  keys(obj) {
    return Object.keys(obj);
  },

  values(obj) {
    return Object.values(obj);
  },

  * hashEach(obj) {
    for (let key of _.keys(obj)) {
      yield [key, obj[key]];
    }
  },

  toArray(iterable) {
    return Array.from(iterable[Symbol.iterator]());
  },

  itReduce(iterable, fn, start) {
    return _.toArray(iterable).reduce(fn, start);
  },
};

export function uuid() {
  return (
    Math.random()
      .toString(36)
      .substring(2, 15) +
    Math.random()
      .toString(36)
      .substring(2, 15)
  );
}
