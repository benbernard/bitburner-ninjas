import * as TK from "./tk.js";
import {NSObject} from "./baseScript.js";

let EXTRA_PROCESS_CONFIG = ["looped-weaken.js", ["joesguns", "0"]];

let processCount = 1;

class ThisScript extends TK.Script {
  constructor(...args) {
    super(...args);
    this.activeAttacks = {};
    this.extraProcesses = {};
    this.hackingHosts = new Map();
  }

  async perform() {
    this.s = this.currentServer();

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
        // First try to hack new machines
        await this.rootReachableServers();

        await this.fillExtraProcesses();
        await this.sleep(5000);
      } catch (e) {
        this.tlog(`Error in hydra loop: ${e.stack || e}, continuing`);
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
      if (worker.availableRam() <= 2) continue;
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

  async workers(useVirtualRam = true) {
    let servers = await this.rootedServers();

    if (useVirtualRam) {
      servers.forEach(server => server.ignoreProcess(...EXTRA_PROCESS_CONFIG));
    }

    return servers.sort((a, b) => b.availableRam() - a.availableRam());
  }

  async rootedServers() {
    return (await this.reachableServers({}, true)).filter(s => s.hasRoot());
  }

  async reachableServers() {
    // Careful not to re-use this.s for traversal, the rest of the code needs unique servers
    return (await this.server(this.s.name).reachableServers({}, true)).filter(
      s => !s.isHacknet()
    );
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
