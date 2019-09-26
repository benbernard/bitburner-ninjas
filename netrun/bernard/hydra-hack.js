import * as TK from "./tk.js";
import {NSObject} from "./baseScript.js";

let TASKS = {
  WEAKEN: "weaken",
  GROW: "grow",
  HACK: "hack",
};

let HOME_TENDERS = ["scheduled-cct.js"];

let STATUS_FILE = "hydra-status.txt";
let EXTRA_PROCESS_CONFIG = ["minimal-weaken.js", ["foodnstuff"]];

class ThisScript extends TK.Script {
  constructor(...args) {
    super(...args);
    this.activeServers = {};
    this.extraProcesses = {};
  }

  async perform() {
    this.s = this.currentServer();

    this.ns.rm(STATUS_FILE, this.s.name);
    this.disableLogging(
      "sleep",
      "scan",
      "getServerRam",
      "getServerRequiredHackingLevel",
      "getServerNumPortsRequired",
      "getServerMaxMoney",
      "getServerMinSecurityLevel",
      "getServerSecurityLevel",
      "getHackingLevel",
      "scp"
    );

    await this.setupHome();

    while (true) {
      // This is the main event loop

      // First clear any finished tasks
      await this.clearFinished();

      // First try to hack new machines
      await this.rootReachableServers();

      // Attack a server if possible
      let didWork = await this.attackOne();

      // Update Status
      await this.updateStatus();

      if (!didWork) {
        await this.fillExtraProcesses();
        await this.sleep(500);
      }
    }
  }

  extraProcessesFor(server) {
    if (!(server.name in this.extraProcesses)) {
      this.extraProcesses[server.name] = [];
    }

    return this.extraProcesses[server.name];
  }

  async fillExtraProcesses() {
    let workers = await this.workers(false);
    let [extraScript, extraArgs] = EXTRA_PROCESS_CONFIG;

    for (let worker of workers) {
      if (worker.availableRam() <= 1) break;
      let threads = worker.computeMaxThreads(extraScript);

      if (threads <= 0) continue;

      // count allows us to start multiple instances
      let count = this.extraProcessesFor(worker).length;

      let process = new RunningProcess(
        this.ns,
        extraScript,
        threads,
        [...extraArgs, count],
        worker
      );

      try {
        await process.run();
        this.addExtraProcess(process);
      } catch (e) {
        // Not sure why this fails sometimes, log and continue
        this.log(`Failed to start process! ${e.message}... continuing`);
      }
    }
  }

  cleanupExtraProcesses() {
    let newTracker = {};
    for (let serverName of Object.keys(this.extraProcesses)) {
      newTracker[serverName] = this.extraProcesses[serverName].filter(p =>
        p.isRunning()
      );
    }

    this.extraProcesses = newTracker;
  }

  addExtraProcess(process) {
    let serverName = process.server.name;
    let processList = this.extraProcessesFor(process.server);
    processList.push(process);
  }

  async setupHome() {
    for (let script of HOME_TENDERS) {
      if (!this.ns.scriptRunning(script, "home")) {
        await this.ns.exec(script, "home", 1);
      }
    }
  }

  async updateStatus() {
    let status = {};
    for (let name of Object.keys(this.activeServers)) {
      let scheduled = this.activeServers[name];
      status[name] = scheduled.runningInfo();
    }

    await this.ns.write(STATUS_FILE, JSON.stringify(status, null, 2), "w");
  }

  async clearFinished() {
    let finishedTasks = Object.values(this.activeServers).filter(
      st => !st.isRunning()
    );

    for (let task of finishedTasks) {
      this.log(
        `Clearing finished task ${task.task} on ${task.worker.name} against ${task.target.name}`
      );
      delete this.activeServers[task.target.name];
    }

    // Also clear out the extras
    await this.cleanupExtraProcesses();
  }

  async workers(useVirtualRam = true) {
    let ramGetter = server => server.availableRam();

    if (useVirtualRam) {
      ramGetter = server => this.availableVirtualRam(server);
    }

    let servers = await this.rootedServers();

    let home = servers.find(s => s.name === "home");
    home.useHalfRam = true;

    return servers.sort((a, b) => ramGetter(b) - ramGetter(a));
  }

  availableVirtualRam(server) {
    let virtualRam = server.availableRam();

    let killableProcesses = this.extraProcessesFor(server.name);
    virtualRam += killableProcesses.reduce((sum, p) => sum + p.ram(), 0);

    return virtualRam;
  }

  async killExtraProcesses(server) {
    let processes = this.extraProcessesFor(server.name);
    for (let proc of processes) {
      await proc.kill();
    }
  }

  async attackOne() {
    // Gather servers for work
    let workers = await this.workers();

    let target = (await this.actionTargets())[0];
    if (!target) return false;
    this.log(`Found target: ${target.name}`);

    let task = this.determineTask(target);

    let scheduled = ScheduledTask.create(this.ns, task, target);
    let selectedWorker = scheduled.selectWorker(workers, w =>
      this.availableVirtualRam(w)
    );

    if (selectedWorker) {
      this.killExtraProcesses(selectedWorker);
      this.setActiveTarget(target, scheduled);
      await scheduled.run();
      return true;
    }

    return false;
  }

  setActiveTarget(target, scheduled) {
    this.activeServers[target.name] = scheduled;
  }

  serverActive(server) {
    return server.name in this.activeServers;
  }

  async actionTargets() {
    let servers = await this.rootedServers();

    return servers
      .filter(s => s.maxMoney() > 0) // exclude purchased and no-money servers
      .filter(s => !(s.name in this.activeServers)) // not currently being worked
      .filter(s => s.hackingLevel() <= this.ns.getHackingLevel()) // can hack the server
      .sort((a, b) => b.maxMoney() - a.maxMoney()); // most money making
  }

  determineTask(server) {
    if (server.security() > securityTarget(server)) {
      return TASKS.WEAKEN;
    }

    if (server.money() < moneyTarget(server) * 0.9) {
      return TASKS.GROW;
    }

    return TASKS.HACK;
  }

  async rootedServers() {
    return (await this.reachableServers({}, true)).filter(s => s.hasRoot());
  }

  async reachableServers() {
    return await this.s.reachableServers({}, true);
  }

  async rootReachableServers() {
    let servers = await this.reachableServers();
    let rootables = servers.filter(s => s.canNuke() && !s.hasRoot());
    for (let server of rootables) {
      this.log(`Nuking ${server.name}`);
      await server.nuke();
    }
  }
}

function securityTarget(server) {
  let min = server.minSecurity();
  return min * 1.2;
}

function moneyTarget(server) {
  return server.maxMoney() * 0.9;
}

class ScheduledTask extends NSObject {
  constructor(ns, task, script, target) {
    super(ns);
    this.task = task;
    this.script = script;
    this.target = target;
  }

  ramUsage() {
    return this.ns.getScriptRam(this.script);
  }

  maxServerThreads() {
    let maxRam = this.ns.getPurchasedServerMaxRam();
    return Math.floor(maxRam / this.ramUsage());
  }

  selectWorker(workers, availableRamFn) {
    let prevWorker = workers[0];
    let desiredThreads = this.desiredThreads();

    for (let worker of workers.slice(1)) {
      let commandRam = this.ns.getScriptRam(this.script);

      // This allows for virtual ram usage
      let availableRam = availableRamFn(worker);
      let maxThreadsForWorker = Math.floor(availableRam / commandRam);

      if (desiredThreads > maxThreadsForWorker) {
        break;
      }

      prevWorker = worker;
    }

    this.worker = prevWorker;

    if (this.workerThreads() <= 0) {
      return null;
    }

    return prevWorker;
  }

  workerThreads() {
    return Math.min(
      this.desiredThreads(),
      this.worker.computeMaxThreads(this.script)
    );
  }

  runningInfo() {
    return `${this.task.toUpperCase()} - on ${this.worker.name} with ${
      this.runningProcess.threads
    } threads, against ${this.target.name}`;
  }

  async run() {
    let process = new RunningProcess(
      this.ns,
      this.script,
      this.workerThreads(),
      [this.target.name],
      this.worker
    );
    let pid = await process.run();

    this.runningProcess = process;
    this.log(`ScheduledTask Started: ${this.runningInfo()}`);
  }

  isRunning() {
    if (!this.runningProcess) return false;
    return this.runningProcess.isRunning();
  }

  desiredThreads() {
    switch (this.task) {
      case TASKS.WEAKEN:
        return Math.min(
          this.target.threadsForMinWeaken(),
          this.maxServerThreads()
        );
      case TASKS.GROW:
        return Math.min(
          this.target.threadsForMaxGrowth(),
          this.maxServerThreads()
        );
      case TASKS.HACK:
        return this.maxServerThreads();
    }
  }

  static create(ns, task, target) {
    let script = `minimal-${task.toLowerCase()}.js`;
    return new ScheduledTask(ns, task, script, target);
  }
}

export let main = ThisScript.runner();

class RunningProcess extends NSObject {
  constructor(ns, script, threads, args, server) {
    super(ns);
    this.script = script;
    this.threads = threads;
    this.args = args;
    this.server = server;
  }

  ram() {
    return this.ns.getScriptRam(this.script) * this.threads;
  }

  isRunning() {
    return this.ns.isRunning(this.script, this.server.name, ...this.args);
  }

  kill() {
    return this.server.kill(this.script, ...this.args);
  }

  async run() {
    let pid = await this.server.exec(this.script, this.threads, ...this.args);

    if (pid === 0) {
      throw new Error(
        `Could not start ${this.script} on ${this.server.name}.  Threads: ${
          this.threads
        }, args: ${JSON.stringify(this.args)}!`
      );
    }

    await this.sleep(1);
    return pid;
  }
}
