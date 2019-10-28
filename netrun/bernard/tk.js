import {NSObject, BaseScript} from "./baseScript.js";
import traverse from "./traverse.js";
import {_, copy} from "./utils.js";

const DYING_FILE = "dying.txt";

const LIBRARY_FILES = ["baseScript.js", "tk.js"];

export class Server extends NSObject {
  constructor(ns, name, parent) {
    super(ns);
    this.name = name;
    this.parent = parent;
    this.reservedRam = name === "home" ? 200 : 0;
    this.ignoredProcesses = [];
  }

  isHacknet() {
    return this.name.startsWith("hacknet");
    // this.name !== "hacknet-node-0" &&
    // this.name !== "hacknet-node-1"
  }

  attackTimings() {
    if (!this._timings) {
      let hackTime = this.hackTime() * 1000;
      let growTime = this.growTime() * 1000;
      let weakenTime = this.weakenTime() * 1000;
      this._timings = {
        hackTime: hackTime,
        hack: hackTime,
        growTime: growTime,
        grow: growTime,
        weakenTime: weakenTime,
        weaken: weakenTime,
      };
    }

    return this._timings;
  }

  clearTimingsCache() {
    this._timings = null;
  }

  hackingLevel() {
    return this.ns.getServerRequiredHackingLevel(this.name);
  }

  isPurchased() {
    return this.name.startsWith("hydra");
  }

  setDying() {
    this.ns.write(DYING_FILE, "not important", "w");
    this.ns.scp([DYING_FILE], "home", this.name);
    this.ns.rm(DYING_FILE, "home");
  }

  isDying() {
    return this.fileExists(DYING_FILE);
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

    return [total, Math.min(used + this.reservedRam, total)];
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

  hackTime() {
    return this.ns.getHackTime(this.name);
  }

  growTime() {
    return this.ns.getGrowTime(this.name);
  }

  weakenTime() {
    return this.ns.getWeakenTime(this.name);
  }

  hasLowSecurity() {
    return this.security() < this.minSecurity() + 3;
  }

  hasLowMoney() {
    return this.money() < this.maxMoney() * 0.95;
  }

  threadsForMinWeaken({extraHack = 0, extraGrow = 0} = {}) {
    let min = this.minSecurity();
    let current = this.security();

    if (extraHack > 0) {
      current += extraHack * 0.002;
    }

    if (extraGrow > 0) {
      current += extraGrow * 0.004;
    }

    let target = current - min;
    return Math.ceil(target / 0.05);
  }

  threadsForMaxMoneyHack(fraction) {
    return this.ns.hackAnalyzeThreads(this.name, this.maxMoney() * fraction);
  }

  threadsForHack(fraction) {
    return Math.ceil(
      this.ns.hackAnalyzeThreads(this.name, this.money() * fraction)
    );
  }

  threadsForHackPercent(percent) {
    return Math.floor(percent / this.ns.hackAnalyzePercent(this.name));
  }

  threadsForMaxGrowth() {
    let money = this.money();
    let maxMoney = this.maxMoney();

    let multiplier = maxMoney / money;
    return Math.ceil(this.threadsForGrowth(multiplier));
  }

  threadsForGrowth(multiplier) {
    return Math.ceil(this.ns.growthAnalyze(this.name, multiplier));
  }

  hasRoot() {
    if (this._hasRoot) return true;
    let result = this.ns.hasRootAccess(this.name);
    if (result) {
      this._hasRoot = true;
    }

    return result;
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
    if (this.hasRoot()) return true;

    return (
      this.ns.getServerNumPortsRequired(this.name) <=
      this.countAvailableCrackers()
    );
  }

  async nuke() {
    if (this.hasRoot()) return;

    if (this.homeFileExists("BruteSSH.exe")) await this.ns.brutessh(this.name);
    if (this.homeFileExists("FTPCrack.exe")) await this.ns.ftpcrack(this.name);
    if (this.homeFileExists("SQLInject.exe"))
      await this.ns.sqlinject(this.name);
    if (this.homeFileExists("relaySMTP.exe"))
      await this.ns.relaysmtp(this.name);
    if (this.homeFileExists("HTTPWorm.exe")) await this.ns.httpworm(this.name);

    await this.ns.nuke(this.name);
  }

  async reachableServers(seen = {}, includeSelf = false) {
    let servers = [];

    if (includeSelf) servers.push(this);
    await this.traverse(server => servers.push(server), seen);
    return servers;
  }

  async traverse(fn, seen = {}, indent = "") {
    let servers = {};
    let wrapper = (s, level, parentName) => {
      let parent = servers[parentName];
      let newServer = new Server(this.ns, s, parent);
      servers[s] = newServer;

      fn(newServer, level);
    };

    return traverse(this.name, this.ns, wrapper, seen, indent);
  }

  info(includePath = false, options = {}) {
    let parts = [
      `${this.name}`,
      "-",
      `Money: ${this.cFormat(this.money())} / ${this.cFormat(this.maxMoney())}`,
      `H: ${this.hackingLevel()}`,
      this.hasRoot() ? "Rooted" : "No Root",
      `S: ${Math.ceil(this.security())} / ${this.minSecurity()}`,
      `R: ${this.rFormat(this.availableRam())} / ${this.rFormat(this.ram())}`,
    ];

    if (includePath) parts.push(`Path: ${this.path(options)}`);
    return parts.join(" ");
  }

  copyConnectionPath() {
    let connectString = this.path({asConnect: true});
    copy(connectString);
  }

  path(options = {}) {
    let parentPath = "";
    if (this.parent) parentPath = this.parent.path(options) + "; ";
    if (options.asConnect) {
      return `${parentPath}connect ${this.name}`;
    } else {
      return `${parentPath} -> ${this.name}`;
    }
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

  rm(filename) {
    return this.ns.rm(filename, this.name);
  }

  async setupScript(script) {
    if (this.name === "home") return; // home is setup by netrun.js

    let files = [script];

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

export class Process extends NSObject {
  constructor(
    ns,
    {server, duration = null, scriptRam = null, script, threads = 1, args = []}
  ) {
    super(ns);
    this.script = script;
    this.args = args;
    this.threads = threads;
    this.server = server;
    this.started = false;

    if (this.threads <= 0 || isNaN(this.threads))
      throw new Error(
        `Invalid thread count passed to Process: ${this.threads}`
      );

    if (scriptRam != null) {
      this._scriptRam = scriptRam;
    }

    this.UUID = this.uuid();
    this.runningArgs = [...this.args, this.UUID];
  }

  now() {
    return this.ns.getTimeSinceLastAug();
  }

  isRunning() {
    if (!this.started) return false;

    if (this.duration && this.startTime + this.duration > this.now())
      return true;

    return this.ns.isRunning(
      this.script,
      this.server.name,
      ...this.runningArgs
    );
  }

  info() {
    return `${this.script} ${JSON.stringify(this.runningArgs)} on ${
      this.server.name
    } T:${this.threads}`;
  }

  run() {
    if (this.started) return;

    this.setup();
    this.startTime = this.ns.getTimeSinceLastAug();
    this.pid = this.ns.exec(
      this.script,
      this.server.name,
      this.threads,
      ...this.runningArgs
    );

    if (this.pid === 0)
      throw new Error(
        `Could not start ${this.info()}, needs ram: ${this.ram()} free: ${this.server.availableRam()}, ps: ${JSON.stringify(
          this.server.ps()
        )}`
      );
    this.started = true;
  }

  ram() {
    return this.scriptRam() * this.threads;
  }

  scriptRam() {
    if (this._scriptRam == null) {
      this._scriptRam = this.ns.getScriptRam(this.script);
    }

    return this._scriptRam;
  }

  kill() {
    if (!this.pid || this.pid === 0) return;
    return this.ns.kill(this.pid);
  }

  setup() {
    let files = [this.script];
    this.ns.scp(files, "home", this.server.name);
  }

  static run(ns, server, script, threads, ...args) {
    let proc = new this(ns, server, script, threads, ...args);
    proc.run();
    return proc;
  }

  tail() {
    if (this.isRunning()) {
      this.ns.tail(this.script, this.server.name, ...this.runningArgs);
    } else {
      this.tlog(`Cannot tail non-running process: ${this.info()}!`);
    }
  }
}

export function scriptForCommand(command) {
  if (command.match(/\.js$/)) return command;
  return `${command}.js`;
}
