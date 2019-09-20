import {BaseScript, NSObject} from "./baseScript.js";

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

  async nuke() {
    await this.ns.httpworm(this.name);
    await this.ns.brutessh(this.name);
    await this.ns.ftpcrack(this.name);
    await this.ns.sqlinject(this.name);
    await this.ns.relaysmtp(this.name);
    await this.ns.nuke(this.name);
  }

  async exec(script, threads, ...args) {
    this.tlog(
      `Running ${script} on ${
        this.name
      } with ${threads} threads and args "${args.join(" ")}"`
    );
    await this.ns.exec(script, this.name, threads, ...args);
  }

  async grow(server, {stock} = {stock: false}) {
    const targetMoney = () => this.ns.getServerMaxMoney(this.name) * 0.9;

    while (this.money() < targetMoney()) {
      this.ns.print("Growing");
      await this.weaken(server);
      await this.maxGrow(server, stock);
    }
  }

  async weaken(server, targetFnOrValue) {
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
      await this.maxWeaken(server);
    }
  }

  exists() {
    return this.ns.serverExists(this.name);
  }

  async maxHack(...args) {
    await this.maxRun("minimal-hack", ...args);
  }

  async maxGrow(...args) {
    await this.maxRun("minimal-grow", ...args);
  }

  async maxWeaken(...args) {
    await this.maxRun("minimal-weaken", ...args);
  }

  async setupScript(script) {
    const files = [script, "tk.js", "baseScript.js"];
    await this.ns.scp(files, "home", this.name);
  }

  async maxRun(command, ...args) {
    const script = scriptForCommand(command);
    await this.setupScript(script);
    await this.ns.scriptKill(script, this.name);

    let threads = this.computeMaxThreads(script);

    this.log(`Running ${script} with ${threads}`);
    await this.ns.exec(script, this.name, threads, ...args);

    this.log(`Waiting for ${script} to complete...`);
    this.ns.disableLog("sleep");
    while (true) {
      if (!this.ns.scriptRunning(script, this.name)) return;
      await this.ns.sleep(100);
    }
  }

  computeMaxThreads(command) {
    const script = scriptForCommand(command);

    let [total, used] = this.ns.getServerRam(this.name);
    let available = total - used;

    let commandRam = this.ns.getScriptRam(script);

    return Math.floor(available / commandRam);
  }
}

export class Script extends BaseScript {
  server(server) {
    return new Server(this.ns, server);
  }

  currentServer() {
    return new Server(this.ns, this.ns.getHostname());
  }

  async maxRun(command, server, ...args) {
    await this.server(server).maxRun(command, ...args);
  }
}

export class ServerScript extends Script {
  constructor(ns) {
    super(ns);
    this.serverName = this.ns.args.shift() || this.ns.getHostname();
    this.s = new Server(ns, this.serverName);

    if (!this.s.exists()) {
      return this.exit(
        `Server "${this.serverName} - ${this.s.name}" does not exist`
      );
    }
  }
}

export function scriptForCommand(command) {
  if (command.match(/\.js$/)) return command;
  return `${command}.js`;
}

export {BaseScript};
