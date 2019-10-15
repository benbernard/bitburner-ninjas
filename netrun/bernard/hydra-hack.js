import * as TK from "./tk.js";
import {NSObject} from "./baseScript.js";

let TASKS = {
  WEAKEN: "weaken",
  GROW: "grow",
  HACK: "hack",
};

let STATUS_FILE = "hydra-status.txt";
let EXTRA_PROCESS_CONFIG = ["looped-weaken.js", ["joesguns", "0"]];

let processCount = 1;

class ThisScript extends TK.Script {
  constructor(...args) {
    super(...args);
    this.activeAttacks = {};
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
      "getServerMoneyAvailable",
      "getServerMaxMoney",
      "getServerMinSecurityLevel",
      "getServerSecurityLevel",
      "getHackingLevel",
      "scp"
    );

    while (true) {
      try {
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
        } else {
          await this.sleep(100);
        }
      } catch (e) {
        this.tlog(`Error in hydra loop: ${e.message}, continuing`);
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
      if (worker.availableRam() <= 64) continue;
      if (worker.availableRam() !== worker.ram()) continue; // only run on un-touched boxes
      let threads = worker.computeMaxThreads(extraScript);

      if (threads <= 0) continue;

      let process = new RunningProcess(
        this.ns,
        extraScript,
        threads,
        [...extraArgs],
        worker
      );

      try {
        await process.run({killIgnored: false});
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

  async updateStatus() {
    let status = {};
    for (let name of Object.keys(this.activeAttacks)) {
      let attack = this.activeAttacks[name];
      status[name] = attack.runningInfo();
    }

    await this.ns.write(STATUS_FILE, JSON.stringify(status, null, 2), "w");
  }

  async clearFinished() {
    let finishedAttacks = Object.values(this.activeAttacks).filter(
      attack => !attack.isRunning()
    );

    for (let attack of finishedAttacks) {
      this.log(
        `Clearing finished task ${attack.task} against ${attack.target.name}`
      );
      delete this.activeAttacks[attack.target.name];
    }

    // Also clear out the extras
    await this.cleanupExtraProcesses();
  }

  async workers(useVirtualRam = true) {
    let servers = await this.rootedServers();

    if (useVirtualRam) {
      servers.forEach(server => server.ignoreProcess(...EXTRA_PROCESS_CONFIG));
    }

    let home = servers.find(s => s.name === "home");
    home.maxRamUsedPercentage = 0.75;
    // home.maxRamUsedPercentage = 0.5;
    // home.maxRamUsedPercentage = 0;

    return servers.sort((a, b) => b.availableRam() - a.availableRam());
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
    let skippedTargets = [];
    let foodTask = this.determineTask(this.server("joesguns"));
    if (foodTask === TASKS.WEAKEN) {
      skippedTargets.push("joesguns");
    }

    let targets = await this.actionTargets(skippedTargets);

    let lastIndex;
    for (let i = 0; i < targets.length; i++) {
      lastIndex = i;
      let target = targets[i];
      if (target.name in this.activeAttacks) {
        continue;
      } else {
        break;
      }
    }
    let target = targets[lastIndex];

    // If we selected the last index, it may already be in flight
    if (!target || target.name in this.activeAttacks) {
      return false;
    }

    this.log(`Found target: ${target.name}`);

    let evictableAttacks = targets
      .slice(lastIndex + 1)
      .filter(name => name in this.activeAttacks)
      .map(name => this.activeAttacks[name]);

    let task = this.determineTask(target);

    let attack = new TargetAttack(this.ns, target, task);
    await attack.start(await this.workers(), evictableAttacks);

    this.activeAttacks[target.name] = attack;
    return true;
  }

  async actionTargets(skipTargets = []) {
    let servers = await this.rootedServers();

    return servers
      .filter(s => s.maxMoney() > 0) // exclude purchased and no-money servers
      .filter(s => s.hackingLevel() <= this.ns.getHackingLevel()) // can hack the server
      .filter(s => skipTargets.indexOf(s.name) === -1)
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
    // Careful not to re-use this.s for traversal, the rest of the code needs unique servers
    return await this.server(this.s.name).reachableServers({}, true);
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

export let main = ThisScript.runner();

function securityTarget(server) {
  let min = server.minSecurity();
  let diff = Math.max(min * 0.2, 5);
  return min + diff;
}

function moneyTarget(server) {
  return server.maxMoney() * 0.9;
}

class RunningProcess extends NSObject {
  constructor(ns, script, threads, args, server) {
    super(ns);
    this.script = script;
    this.threads = threads;
    this.args = [...args, processCount++];
    this.server = server;
  }

  ram() {
    return this.ns.getScriptRam(this.script) * this.threads;
  }

  isRunning() {
    return this.ns.isRunning(this.script, this.server.name, ...this.args);
  }

  kill() {
    return this.server.kill(this.pid);
  }

  async run({killIgnoredProcesses} = {killIgnoredProcesses: true}) {
    if (killIgnoredProcesses) await this.server.killIgnoredProcesses();
    this.pid = await this.server.exec(this.script, this.threads, ...this.args);

    if (this.pid === 0) {
      let msg = `Could not start ${this.script} on ${
        this.server.name
      }.  Threads: ${this.threads}, args: ${JSON.stringify(
        this.args
      )}, PS: ${JSON.stringify(this.server.ps())}, MemInfo: ${JSON.stringify(
        this.server.ramInfo()
      )} RealMemInfo: ${JSON.stringify(
        this.ns.getServerRam(this.server.name)
      )}!`;

      this.log(msg);

      throw new Error(msg);
    }

    await this.sleep(1);
    return this.pid;
  }

  runningInfo() {
    return `Running ${this.script} on ${this.server.name} (t=${
      this.threads
    }) args: ${JSON.stringify(this.args)}`;
  }
}

class TargetAttack extends NSObject {
  constructor(ns, target, task) {
    super(ns);
    this.target = target;
    this.runningProcesses = [];
    this.task = task;
  }

  kill() {
    this.runningProcesses.forEach(proc => proc.kill());
  }

  isRunning() {
    this.clearFinished();
    return this.runningProcesses.length > 0;
  }

  clearFinished() {
    this.runningProcesses = this.runningProcesses.filter(proc =>
      proc.isRunning()
    );
  }

  desiredThreads() {
    switch (this.task) {
      case TASKS.WEAKEN:
        return this.target.threadsForMinWeaken();
      case TASKS.GROW:
        return this.target.threadsForMaxGrowth();
      case TASKS.HACK:
        return this.target.threadsForHack(0.5);
      default:
        throw new Error(`Unrecognized task ${this.task}`);
    }
  }

  get script() {
    return `minimal-${this.task}.js`;
  }

  ram() {
    return this.runningProcesses.reduce((sum, proc) => sum + proc.ram(), 0);
  }

  async addRun(worker, threads) {
    let process = new RunningProcess(
      this.ns,
      this.script,
      threads,
      [this.target.name, this.script === "minimal-grow.js" ? "1" : "0"],
      worker
    );
    let pid = await process.run();
    this.runningProcesses.push(process);
  }

  async start(workers, evictableAttacks) {
    let desiredThreads = this.desiredThreads();

    desiredThreads = await this.useAvailableRam(workers, desiredThreads);
    if (desiredThreads === 0) return;

    for (let attack of evictableAttacks.reverse()) {
      attack.kill();
      desiredThreads = await this.useAvailableRam(workers, desiredThreads);
      if (desiredThreads === 0) break;
    }
  }

  async useAvailableRam(workers, desiredThreads) {
    while (desiredThreads > 0) {
      let selected = this.selectCapableWorker(workers, desiredThreads);
      if (!selected) break;

      let maxThreads = selected.computeMaxThreads(this.script);
      if (maxThreads <= 0) break;

      let runThreads = Math.min(desiredThreads, maxThreads);
      await this.addRun(selected, runThreads);
      desiredThreads -= runThreads;

      await this.sleep(10);
    }

    return desiredThreads;
  }

  selectCapableWorker(workers, desiredThreads) {
    let sorted = workers.sort((a, b) => b.availableRam() - a.availableRam());
    let selected = sorted[0];

    for (let worker of sorted.slice(1)) {
      let maxRunnable = worker.computeMaxThreads(this.script);
      if (maxRunnable < desiredThreads) {
        break;
      } else {
        selected = worker;
      }
    }

    if (selected.computeMaxThreads(this.script) !== 0) return selected;
    return false;
  }

  runningInfo() {
    return this.runningProcesses.map(proc => proc.runningInfo());
  }
}
