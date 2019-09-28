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
    this.useHalfRam = false;
    this.ignoredProcesses = [];
  }

  hackingLevel() {
    return this.ns.getServerRequiredHackingLevel(this.name);
  }

  killIgnoredProcesses() {
    this.log(`Killing ignored procs on ${this.name}`);
    let procs = this.runningIgnoredProcesses();
    procs.forEach(proc => this.kill(proc.filename, ...proc.args));
    return this.sleep(1);
  }

  runningIgnoredProcesses() {
    let ps = this.ps();
    let procs = [];
    for (let proc of ps) {
      for (let [script, args] of this.ignoredProcesses) {
        let matchingArgs = proc.args.slice(0, args.length);
        if (
          proc.filename === script &&
          JSON.stringify(matchingArgs) === JSON.stringify(args)
        ) {
          procs.push(proc);
        }
      }
    }

    return procs;
  }

  printRamInfo() {
    this.tlog(
      `Server ${
        this.name
      } - ${this.availableRam()}/${this.ram()} Avail/Used - NS: ${this.ns.getServerRam(
        this.name
      )}`
    );

    this.tlog(
      `Ignored Procs: ${JSON.stringify(this.runningIgnoredProcesses())}`
    );
  }

  ignoredProcessesRam() {
    return this.runningIgnoredProcesses().reduce((sum, proc) => {
      return sum + Math.floor(this.scriptRam(proc.filename) * proc.threads);
    }, 0);
  }

  ignoreProcess(script, ...args) {
    this.ignoredProcesses.push([script, ...args]);
  }

  ram() {
    return this.ramInfo()[0];
  }

  ramInfo() {
    let [total, used] = this.ns.getServerRam(this.name);
    used -= this.ignoredProcessesRam();

    if (this.useHalfRam) {
      let halfMaxTotal = Math.floor(total * 0.5);
      return [total, Math.min(used + halfMaxTotal, total)];
    } else {
      return [total, used];
    }
  }

  availableRam() {
    let [total, used] = this.ramInfo();
    return total - used;
  }

  money() {
    return this.ns.getServerMoneyAvailable(this.name);
  }

  maxMoney() {
    return this.ns.getServerMaxMoney(this.name);
  }

  securityCost(threads, op) {
    if (op === "hack") {
      return threads * 0.002;
    } else if (op === "grow") {
      return threads * 0.004;
    } else {
      throw new Error(`Unrecognized security cost op: ${op}`);
    }
  }

  threadsForMinWeaken() {
    let min = this.minSecurity();
    let current = this.security();

    let target = current - min;
    return Math.ceil(target / 0.05);
  }

  threadsForHack(fraction) {
    return Math.ceil(
      this.ns.hackAnalyzeThreads(this.name, this.money() * fraction)
    );
  }

  threadsForMaxGrowth() {
    let money = this.money();
    let maxMoney = this.maxMoney();

    let multiplier = maxMoney / money;
    return Math.ceil(this.threadsForGrowth(multiplier));
  }

  threadsForGrowth(multiplier) {
    return this.ns.growthAnalyze(this.name, multiplier);
  }

  hasRoot() {
    return this.ns.hasRootAccess(this.name);
  }

  async reachableServers(seen = {}, includeSelf = false) {
    let servers = [];

    if (includeSelf) servers.push(this);

    await this.traverse(server => servers.push(server), seen);
    return servers;
  }

  fileExists(file) {
    return this.ns.fileExists(file, this.name);
  }

  homeFileExists(file) {
    return this.ns.fileExists(file, "home");
  }

  countAvailableCrackers() {
    let count = 0;
    if (this.homeFileExists("BruteSSH.exe")) count++;
    if (this.homeFileExists("FTPCrack.exe")) count++;
    if (this.homeFileExists("SQLInject.exe")) count++;
    if (this.homeFileExists("relaySMTP.exe")) count++;
    if (this.homeFileExists("HTTPWorm.exe")) count++;

    return count;
  }

  canNuke() {
    return (
      this.ns.getServerNumPortsRequired(this.name) <=
      this.countAvailableCrackers()
    );
  }

  async nuke() {
    if (this.homeFileExists("BruteSSH.exe")) await this.ns.brutessh(this.name);
    if (this.homeFileExists("FTPCrack.exe")) await this.ns.ftpcrack(this.name);
    if (this.homeFileExists("SQLInject.exe"))
      await this.ns.sqlinject(this.name);
    if (this.homeFileExists("relaySMTP.exe"))
      await this.ns.relaysmtp(this.name);
    if (this.homeFileExists("HTTPWorm.exe")) await this.ns.httpworm(this.name);

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
    this.log(
      `Running ${script} on ${
        this.name
      } with ${threads} threads and args "${args.join(",")}"`
    );

    await this.setupScript(script);
    return await this.ns.exec(script, this.name, threads, ...args);
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

  kill(script, ...args) {
    return this.ns.kill(script, this.name, ...args);
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
    if (this.name === "home") return; // home is setup by netrun.js

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
    await this.exec(script, threads, ...args);

    this.log(`Waiting for ${script} to complete...`);
    this.ns.disableLog("sleep");

    while (true) {
      if (!this.ns.scriptRunning(script, this.name)) return;
      await this.ns.sleep(500);
    }
  }

  async waitForScriptToComplete(script) {
    while (true) {
      if (!this.ns.scriptRunning(script, this.name)) return;
      await this.ns.sleep(500);
    }
  }

  async awaitRun(script, threads, ...args) {
    this.ns.disableLog("sleep");

    await this.exec(script, threads, ...args);
    await this.sleep(1);

    while (true) {
      if (!this.ns.isRunning(script, this.name, ...args)) return;
      await this.ns.sleep(500);
    }
  }

  scriptRam(script) {
    return this.ns.getScriptRam(script);
  }

  computeMaxThreads(command) {
    const script = scriptForCommand(command);

    let available = this.availableRam();
    let commandRam = this.scriptRam(script);

    let threads = Math.floor(available / commandRam);

    return threads;
  }
}

export class Script extends BaseScript {
  get home() {
    if (!this._home) this._home = this.server("home");
    return this._home;
  }

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
      throw new Error(
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
