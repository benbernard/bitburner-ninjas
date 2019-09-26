import * as TK from "./tk.js";
import {NSObject} from "./baseScript.js";

let TASKS = {
  WEAKEN: "weaken",
  GROW: "grow",
  HACK: "hack",
};

let HOME_TENDERS = ["scheduled-cct.js"];

let STATUS_FILE = "hydra-status.txt";

class ThisScript extends TK.Script {
  constructor(...args) {
    super(...args);
    this.activeServers = {};
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
      this.log(`Clearing finsihed tasks`);
      await this.clearFinished();

      // First try to hack new machines
      this.log(`Rooting new servers`);
      await this.rootReachableServers();

      // Attack a server if possible
      this.log(`Attacking a target`);
      let didWork = await this.attackOne();

      // Update Status
      await this.updateStatus();

      if (!didWork) {
        this.log("Found no doable work, sleeping");
        await this.sleep(500);
      }
    }
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

  clearFinished() {
    let finishedTasks = Object.values(this.activeServers).filter(
      st => !st.isRunning()
    );

    for (let task of finishedTasks) {
      this.log(
        `Clearing finished task ${task.task} on ${task.worker.name} against ${task.target.name}`
      );
      delete this.activeServers[task.target.name];
    }
  }

  async attackOne() {
    // Gather servers for work
    let workers = (await this.rootedServers()).sort(
      (a, b) => b.availableRam() - a.availableRam()
    );

    let home = workers.find(w => w.name === "home");
    home.useHalfRam = true;

    let target = (await this.actionTargets())[0];
    this.log(`Found target: ${target}`);
    if (!target) return false;

    let task = this.determineTask(target);

    let scheduled = ScheduledTask.create(this.ns, task, target);
    let usedWorker = scheduled.selectWorker(workers);

    if (usedWorker) {
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

  selectWorker(workers) {
    let prevWorker = workers[0];
    let desiredThreads = this.desiredThreads();

    for (let worker of workers.slice(1)) {
      let maxThreadsForWorker = worker.computeMaxThreads(this.script);

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
      this.runningThreads
    } threads, against ${this.target.name}`;
  }

  async run() {
    this.runningThreads = this.workerThreads();
    let pid = await this.worker.exec(
      this.script,
      this.runningThreads,
      this.target.name
    );

    if (pid === 0)
      throw new Error(`Could not start ${this.script} on ${this.worker.name}!`);
    this.log(`ScheduledTask Started: ${this.runningInfo()}`);
    await this.sleep(1);
  }

  isRunning() {
    return this.ns.isRunning(this.script, this.worker.name, this.target.name);
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
