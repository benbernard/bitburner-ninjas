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
  constructor(ns, name, parent) {
    super(ns);
    this.name = name;
    this.parent = parent;
  }

  hackingLevel() {
    return this.ns.getServerRequiredHackingLevel(this.name);
  }

  money() {
    return this.ns.getServerMoneyAvailable(this.name);
  }

  maxMoney() {
    return this.ns.getServerMaxMoney(this.name);
  }

  hasRoot() {
    return this.ns.hasRootAccess(this.name);
  }

  async reachableServers(seen = {}) {
    let servers = [];
    await this.traverse(server => servers.push(server), seen);
    return servers;
  }

  async nuke() {
    await this.ns.httpworm(this.name);
    await this.ns.brutessh(this.name);
    await this.ns.ftpcrack(this.name);
    await this.ns.sqlinject(this.name);
    await this.ns.relaysmtp(this.name);
    await this.ns.nuke(this.name);
  }

  async traverse(fn, seen = {}, indent = "") {
    seen[this.name] = 1;
    let children = await this.scan();
    children = children.filter(name => !seen[name]);

    for (let child of children) {
      let childServer = new Server(this.ns, child, this);
      await fn(childServer, indent);
      seen[child] = 1;
      await childServer.traverse(fn, seen, `${indent}  `);
    }
  }

  info(includePath = false) {
    let parts = [
      `${this.name}`,
      "-",
      `Money: ${this.cFormat(this.money())} / ${this.cFormat(this.maxMoney())}`,
      `Hack: ${this.hackingLevel()}`,
      `Root: ${this.hasRoot() ? "YES" : "NO"}`,
    ];

    if (includePath) parts.push(`Path: ${this.path()}`);
    return parts.join(" ");
  }

  path() {
    if (!this.parent) return this.name;
    return `${this.parent.path()} -> ${this.name}`;
  }

  scan() {
    return this.ns.scan(this.name);
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
    const targetServer = new Server(this.ns, server);
    const targetMoney = () => targetServer.maxMoney() * 0.9;

    while (targetServer.money() < targetMoney()) {
      this.ns.print("Growing");
      await this.weaken(server);
      await this.maxGrow(server, stock);
    }
  }

  tail(script, ...args) {
    return this.ns.tail(script, this.name, ...args);
  }

  ps() {
    return this.ns.ps(this.name);
  }

  killall() {
    return this.ns.killall(this.name);
  }

  minSecurity() {
    return this.ns.getServerMinSecurityLevel(this.name);
  }

  baseSecurity() {
    return this.ns.getServerBaseSecurityLevel(this.name);
  }

  security() {
    return this.ns.getServerSecurityLevel(this.name);
  }

  async weaken(serverName, targetFnOrValue) {
    const targetServer = new Server(this.ns, serverName);
    let currentSecurity = () => targetServer.security();

    let targetSecurity = () => {
      let min = targetServer.minSecurity();
      let diff = targetServer.baseSecurity() - min;
      return min + diff * 0.2;
    };

    if (targetFnOrValue) {
      if (_.isFunction(targetFnOrValue)) {
        targetSecurity = targetFnOrValue;
      } else {
        targetSecurity = _.constant(targetFnOrValue);
      }
    }

    while (currentSecurity() > targetSecurity()) {
      await this.maxWeaken(serverName);
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

  ls() {
    return this.ns.ls(this.name);
  }

  async setupScript(script) {
    let files = this.ns.ls("home");
    files = files.filter(file => file.endsWith(".js"));

    // Remove files before scp to suppress warnings
    for (let file of files) {
      await this.ns.rm(file, this.name);
    }

    await this.ns.scp(files, "home", this.name);
  }

  async maxRun(command, ...args) {
    const script = scriptForCommand(command);
    await this.ns.scriptKill(script, this.name);

    let threads = this.computeMaxThreads(script);

    this.log(`Running ${script} with ${threads}`);
    await this.ns.run(script, threads, ...args);

    this.log(`Waiting for ${script} to complete...`);
    this.ns.disableLog("sleep");

    while (true) {
      if (!this.ns.scriptRunning(script, this.name)) return;
      await this.ns.sleep(500);
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
