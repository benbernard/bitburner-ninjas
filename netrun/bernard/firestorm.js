import * as TK from "./tk.js";
import {NSObject} from "./baseScript.js";

let GROW_SCRIPT = "minimal-grow.js";
let WEAKEN_SCRIPT = "minimal-weaken.js";
let HACK_SCRIPT = "minimal-hack.js";
class ThisScript extends TK.Script {
  async prepareAll() {
    let servers = await this.home.reachableServers();
    servers = servers.filter(s => s.maxMoney() > 0).sort(byMoneyPerTime);

    let delayedJobs = [];
    for (let server of servers) {
      let growThreads = server.threadsForMaxGrowth();
      let weakenThreads = server.threadsForMinWeaken({extraGrow: growThreads});

      if (growThreads > 0) {
        let job = new DelayedRun(
          this.ns,
          0,
          GROW_SCRIPT,
          growThreads,
          server.name,
          0
        );
        job.run();
        delayedJobs.push(job);
      }

      if (weakenThreads > 0) {
        let job = new DelayedRun(
          this.ns,
          0,
          WEAKEN_SCRIPT,
          weakenThreads,
          server.name
        );
        job.run();
        delayedJobs.push(job);
      }
    }

    this.tlog(`Running ${delayedJobs.length} jobs`);

    if (delayedJobs.length === 0) return;

    while (true) {
      await this.sleep(1000);
      for (let job of delayedJobs) {
        if (job.isRunning()) continue;
      }
      break;
    }

    this.tlog(`Done preparing`);
  }

  async perform() {
    this.disableLogging("sleep");
    if (this.hasArg("--prepAll")) return this.prepareAll();

    let host = this.pullFirstArg() || "summit-uni";
    let server = this.server(host);

    let planOnly = this.hasArg("--planOnly");

    this.printTimes(host);

    this.tlog(`Preparing ${host}`);
    await this.prepareServer(server);
    this.tlog(`Done preparing`);

    let lastAttack;
    let attacks = [];
    let start = this.ns.getTimeSinceLastAug();

    let hackThreads = Math.floor(
      this.ns.hackAnalyzeThreads(server.name, server.money() * 0.5)
    );

    let growThreads = Math.ceil(server.threadsForGrowth(2));

    for (let i = 0; i < 8; i++) {
      let attack = new PodAttack(
        this.ns,
        server,
        lastAttack,
        hackThreads,
        growThreads,
        start
      );
      lastAttack = attack;
      attacks.push(attack);
    }

    let count = 0;
    for (let attack of attacks) {
      this.tlog(`${count}: ${attack.info()}`);
      count++;
    }

    if (planOnly) return;

    while (true) {
      let now = this.ns.getTimeSinceLastAug();

      let done = true;
      for (let attack of attacks) {
        if (attack.isRunning()) done = false;
        attack.run(now);
      }

      if (done) break;

      await this.sleep(50);
    }

    this.tlog(`Firestorm complete ${this.logDate()}`);
  }

  printTimes(name) {
    let weakenTime = round2(this.ns.getWeakenTime(name));
    let growTime = round2(this.ns.getGrowTime(name));
    let hackTime = round2(this.ns.getHackTime(name));

    this.tlog(`Weaken: ${weakenTime} Grow: ${growTime} Hack: ${hackTime}`);
  }

  async measure(fn, type, time) {
    let start = this.ns.getTimeSinceLastAug();
    await fn();
    let end = this.ns.getTimeSinceLastAug();

    this.tlog(`Type ${type} took ${(end - start) / 1000} expected: ${time}`);
  }

  readyToAttack(server) {
    if (server.money() < server.maxMoney() * 0.95) return false;
    if (server.security() > server.minSecurity() + 5) return false;
    return true;
  }

  async prepareServer(server) {
    let growThreads = server.threadsForMaxGrowth();
    let weakenThreads = server.threadsForMinWeaken({extraGrow: growThreads});
    if (growThreads <= 0 && weakenThreads <= 0) return;

    if (growThreads > 0) this.ns.run(GROW_SCRIPT, growThreads, server.name);
    if (weakenThreads > 0)
      this.ns.run(WEAKEN_SCRIPT, weakenThreads, server.name);

    let startTime = this.ns.getTimeSinceLastAug();
    while (true) {
      if (!this.ns.isRunning(GROW_SCRIPT, "home", server.name)) {
        if (!this.ns.isRunning(WEAKEN_SCRIPT, "home", server.name)) {
          break;
        }
      }

      await this.sleep(100);
    }

    let endTime = this.ns.getTimeSinceLastAug();
    this.tlog(`Took ${(endTime - startTime) / 1000} to prepare`);
  }
}

class DelayedRun extends NSObject {
  constructor(ns, startTime, script, threads, ...args) {
    super(ns);
    this.script = script;
    this.args = args;
    this.startTime = startTime;
    this.threads = threads;

    this.started = false;
    this.UUID = this.uuid();
  }

  runIfTime(now) {
    if (this.started) return;
    if (now > this.startTime) {
      this.run();
    }
  }

  runningArgs() {
    return [...this.args, this.UUID];
  }

  isRunning() {
    if (!this.started) return true;
    return this.ns.isRunning(this.script, "hydra", ...this.runningArgs());
  }

  run() {
    this.started = true;
    let pid = this.ns.exec(
      this.script,
      "hydra",
      this.threads,
      ...this.runningArgs()
    );
    if (pid === 0)
      throw new Error(
        `Could not start ${this.script} ${this.runningArgs().join(" ")}`
      );
  }
}

class PodAttack extends NSObject {
  constructor(ns, server, parent, hackThreads, growThreads, startTime) {
    super(ns);
    this.server = server;
    this.parent = parent;

    if (this.parent) {
      this.startTime = this.parent.startTime + 2000;
    } else {
      this.startTime = startTime;
    }

    this.originalStartTime = startTime;

    this.hackTime = this.server.hackTime() * 1000;
    this.growTime = this.server.growTime() * 1000;
    this.weakenTime = this.server.weakenTime() * 1000;

    this.hackThreads = hackThreads;
    this.growThreads = growThreads;
    this.weakenGrowThreads = Math.ceil((growThreads * 0.004) / 0.05);
    this.weakenHackThreads = Math.ceil((hackThreads * 0.002) / 0.05);

    this.delayedAttacks = [
      new DelayedRun(
        this.ns,
        this.startWeakenHackTime(),
        WEAKEN_SCRIPT,
        this.weakenHackThreads,
        server.name
      ),
      new DelayedRun(
        this.ns,
        this.startWeakenGrowTime(),
        WEAKEN_SCRIPT,
        this.weakenGrowThreads,
        server.name
      ),
      new DelayedRun(
        this.ns,
        this.startHackTime(),
        HACK_SCRIPT,
        this.hackThreads,
        server.name,
        0
      ),
      new DelayedRun(
        this.ns,
        this.startGrowTime(),
        GROW_SCRIPT,
        this.growThreads,
        server.name,
        0
      ),
    ];
  }

  async run(time) {
    for (let attack of this.delayedAttacks) {
      attack.runIfTime(time);
    }
  }

  isRunning() {
    for (let attack of this.delayedAttacks) {
      if (attack.isRunning()) return true;
    }

    return false;
  }

  startWeakenGrowTime() {
    return this.startTime + 1000;
  }

  startWeakenHackTime() {
    return this.startTime;
  }

  endWeakenHackTime() {
    return this.startWeakenHackTime() + this.weakenTime;
  }

  endWeakenGrowTime() {
    return this.startWeakenGrowTime() + this.weakenTime;
  }

  startHackTime() {
    return this.endWeakenHackTime() - this.hackTime - 500;
  }

  endHackTime() {
    return this.startHackTime() + this.hackTime;
  }

  startGrowTime() {
    return this.endWeakenGrowTime() - this.growTime - 500;
  }

  endGrowTime() {
    return this.startGrowTime() + this.growTime;
  }

  offsetTime(time) {
    let offsetTime = time - this.originalStartTime;
    return this.rounded(offsetTime);
  }

  rounded(time) {
    return round2(time / 1000);
  }

  info() {
    return [
      `Hack: ${this.offsetTime(this.startHackTime())} to ${this.offsetTime(
        this.endHackTime()
      )} D: ${this.rounded(this.hackTime)} T: ${this.hackThreads}`,
      `Weaken Hack: ${this.offsetTime(
        this.startWeakenHackTime()
      )} to ${this.offsetTime(this.endWeakenHackTime())} D: ${this.rounded(
        this.weakenTime
      )} T: ${this.weakenHackThreads}`,
      `Grow: ${this.offsetTime(this.startGrowTime())} to ${this.offsetTime(
        this.endGrowTime()
      )} D: ${this.rounded(this.growTime)} T: ${this.growThreads}`,
      `Weaken Grow: ${this.offsetTime(
        this.startWeakenGrowTime()
      )} to ${this.offsetTime(this.endWeakenGrowTime())} D: ${this.rounded(
        this.weakenTime
      )} T: ${this.weakenGrowThreads}`,
    ].join(" ");
  }
}

function round2(num) {
  return Math.floor(num * 100) / 100;
}

function byMoneyPerTime(a, b) {
  return moneyPerTime(b) - moneyPerTime(a);
}

function moneyPerTime(server) {
  let money = server.maxMoney() * 0.5;
  let time = server.hackTime() + server.growTime() + server.weakenTime();
  return money / time;
}

function byMoneyPerRam(a, b) {
  return moneyPerRam(b) - moneyPerRam(a);
}

function moneyPerRam(server) {
  let hackThreads = server.threadsForHackPercent(50);
  let growThreads = Math.ceil(server.threadsForGrowth(2));
  let weakenThreads = (hackThreads * 0.002 + growThreads * 0.004) / 0.05;

  let hackRam = server.scriptRam("minimal-hack.js");
  let growRam = server.scriptRam("minimal-grow.js");
  let weakenRam = server.scriptRam("minimal-weaken.js");

  let ram =
    hackRam * hackThreads + growThreads * growRam + weakenRam * weakenThreads;

  let money = server.maxMoney() * 0.5;

  return money / ram;
}

export let main = ThisScript.runner();
