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

export let _ = {
  isFunction(val) {
    return typeof val === "function";
  },

  constant(val) {
    return () => val;
  },
};

export class Server extends NSObject {
  constructor(ns, name) {
    super(ns);
    this.name = name;
  }

  money() {
    return this.ns.getServerMoneyAvailable(this.name);
  }

  async grow({stock} = {stock: false}) {
    const targetMoney = () => this.ns.getServerMaxMoney(this.name) * 0.9;

    while (this.money() < targetMoney()) {
      this.ns.print("Growing");
      await this.weaken();
      await this.ns.grow(this.name, {stock});
    }
  }

  async weaken(targetFnOrValue) {
    let currentSecurity = () => this.ns.getServerSecurityLevel(this.name);

    let targetSecurity = () => {
      let base = this.ns.getServerMinSecurityLevel(this.name);
      let diff = this.ns.getServerBaseSecurityLevel(this.name) - base;
      return base + diff * 0.2;
    };

    if (targetFnOrValue) {
      if (_.isFunction(targetFnOrValue)) {
        targetSecurity = targetFnOrValue;
      } else {
        targetSecurity = _.constant(targetFnOrValue);
      }
    }

    while (currentSecurity() > targetSecurity()) {
      await this.ns.weaken(this.name);
    }
  }
}

export class Script extends NSObject {
  get args() {
    return this.ns.args;
  }

  async run() {
    this.ns.tprint("Subclass must implement2");
  }

  tlog(msg) {
    this.ns.tprint(msg);
  }

  log(msg) {
    this.ns.print(msg);
  }

  server(server) {
    return new Server(this.ns, server);
  }

  static runner() {
    let self = this;
    return async function (ns) {
      let inst = new self(ns);
      await inst.run();
    };
  }
}

export class ServerScript extends Script {
  constructor(ns) {
    super(ns);
    this.serverName = this.ns.args.shift() || this.ns.getHostname();
    this.s = new Server(ns, this.serverName);
  }
}
