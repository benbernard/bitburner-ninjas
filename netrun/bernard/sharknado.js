import * as TK from "./tk.js";
import {NSObject} from "./baseScript.js";
import {_, json} from "./utils.js";
import {Queue, Request} from "./workerQueue.js";

const STATUS_FILE = "sharknado-status.txt";
const WORKER_SCRIPT = "hackd.js";
const TARGET_HACK_MIN = 10;

const HACK_SECURITY_COST = 0.002;
const GROW_SECURITY_COST = 0.004;
const WEAKEN_SECURITY_HEAL = 0.05;

const SECURITY_BUFFER = 3;

const DEBUG = true;

class ThisScript extends TK.Script {
  async allServers() {
    let servers = await this.home.reachableServers({}, true);
    return servers.filter(s => s.canNuke());
  }

  async workers() {
    let servers = await this.allServers();
    return servers.filter(s => !s.isDying()).filter(s => s.ram() > 0);
  }

  async nukeServers() {
    for (let server of await this.allServers()) {
      if (!server.hasRoot()) await server.nuke();
    }
  }

  now() {
    return Date.now();
  }

  updateStatus() {
    let info = {
      maxThreads: this.queue.maxThreads,
      availableThreads: this.queue.availableThreads,
      threadManager: this.threadManager.availableThreads(),
      attackInfo: _.toArray(this.attacks).map(a => a.infos()),
    };
    this.ns.write(STATUS_FILE, json(info, null, 2), "w");
  }

  async serversToAttack() {
    let servers = await this.allServers();
    servers.forEach(s => s.nuke());
    let hackingLevel = this.ns.getHackingLevel();
    return servers
      .filter(s => s.maxMoney() > 0)
      .filter(s => s.hackingLevel() <= hackingLevel)
      .sort(byMoneyPerTime);
  }

  async determineTarget() {
    if (this.target && this.targetHacks < TARGET_HACK_MIN) {
      this.target.clearTimingsCache();
      return this.target;
    }

    let newTarget = (await this.serversToAttack())[0];
    if (!this.target || this.target.name !== newTarget.name) {
      this.target = newTarget;
      this.targetHacks = 0;
    }

    return this.target;
  }

  cleanup() {
    let removed = false;
    for (let attack of this.attacks) {
      if (!attack.isRunning()) {
        removed = true;
        this.attacks.delete(attack);
      }
    }

    if (removed) {
      this.updateAttackedServerSet();
    }
  }

  updateAttackedServerSet() {
    this.attackedServers = new Set();
    for (let attack of this.attacks) {
      this.attackedServers.add(attack.server.name);
    }
  }

  async perform() {
    this.disableLogging(
      "sleep",
      "getServerRam",
      "scan",
      "getServerRequiredHackingLevel",
      "getServerNumPortsRequired",
      "getServerMoneyAvailable",
      "getServerMaxMoney",
      "getServerMinSecurityLevel",
      "getServerSecurityLevel",
      "getHackingLevel",
      "scp"
    );
    if (this.hasArg("--prepAll")) return this.prepareAll();

    this.queue = Queue.createInstance();
    this.addFinally(() => this.queue.shutdown());

    await this.fillWorkers({wait: true});
    this.addFinally(() => this.procs.forEach(p => p.kill()));

    this.attacks = new Set();
    this.attackedServers = new Set();
    // TODO: Need a way to handle dying in new world
    // just send new type of request?
    // also don't fill dying workers

    let count = 0;
    let sleepMs = 10;
    let periodic = 5000 / sleepMs;
    this.threadManager = new ThreadManager(this.ns, this.queue);
    let lastTime = 0;

    while (true) {
      let now = this.now();
      lastTime = now;

      if (count % periodic === 0) {
        count = 0;
        await this.fillWorkers();
      }

      this.cleanup();

      let target = await this.determineTarget();
      await this.createPrepAttacks(now);
      this.createPodAttack(target, now);

      this.runAttacks(now);

      if (count % periodic === 0) {
        this.updateStatus();
      }

      await this.delay(sleepMs);
      count++;
    }
  }

  delay(ms) {
    return new Promise((resolve, reject) => {
      setTimeout(resolve, ms);
    });
  }

  runAttacks(now) {
    let target;
    let hasLowSec = false;

    for (let attack of this.attacks) {
      if (!target || target.name !== attack.server.name) {
        target = attack.server;
        hasLowSec = target.hasLowSecurity();
      }

      if (hasLowSec || attack.canAttackHighSec) attack.run(now);
    }
  }

  addAttack(attack) {
    this.lastAttack = attack;
    this.attacks.add(attack);
    this.attackedServers.add(attack.server.name);

    if (this.target.name === attack.server.name && attack.fullRun) {
      this.targetHacks++;
    }
  }

  parentAttack(target) {
    if (this.lastAttack) {
      if (this.lastAttack.server.name === target.name) {
        return this.lastAttack;
      }
    }

    return null;
  }

  async createPrepAttacks(now) {
    for (let target of await this.serversToAttack()) {
      if (this.threadManager.availableThreads() < 10) return;
      if (this.attackedServers.has(target.name)) continue;
      if (this.readyToAttack(target)) continue;

      let attack = new PodAttack(this.ns, {
        queue: this.queue,
        startTime: now,
        server: target,
        threadManager: this.threadManager,
        firstRun: true,
        canAttackHighSec: true,
      });

      this.addAttack(attack);
      attack.run(now);
      if (!attack.fullRun) {
        return;
      }
    }
  }

  createPodAttack(target, now) {
    if (this.threadManager.availableThreads() <= 10) return;
    if (!target.hasLowSecurity()) return;

    let hackThreads = target.threadsForHack(0.5);
    let growThreads = Math.ceil(target.threadsForGrowth(2));
    let weakenThreads =
      Math.ceil((hackThreads * HACK_SECURITY_COST) / WEAKEN_SECURITY_HEAL) +
      Math.ceil((growThreads * GROW_SECURITY_COST) / WEAKEN_SECURITY_HEAL);

    target.clearTimingsCache();

    if (this.targetHacks === 0) {
      if (this.attackedServers.has(target.name)) return;
      let firstAttack = new PodAttack(this.ns, {
        parent: this.parentAttack(target),
        queue: this.queue,
        startTime: now,
        server: target,
        threadManager: this.threadManager,
        firstRun: true,
      });
      this.addAttack(firstAttack);
    }

    let first = true;
    while (
      this.threadManager.availableThreads() >
      hackThreads + growThreads + weakenThreads
    ) {
      if (DEBUG && first) this.log(`Starting fill loop`);
      first = false;

      let attack = new PodAttack(this.ns, {
        parent: this.parentAttack(target),
        queue: this.queue,
        startTime: now,
        server: target,
        priority: 0,
        threadManager: this.threadManager,
      });

      if (attack.isTooFarFuture(now)) break;
      this.addAttack(attack);
    }
  }

  async fillWorkers({wait = false} = {}) {
    if (!this.procs) this.procs = new Set();
    await this.nukeServers();

    let ramPerThread = scriptRam(this.ns, WORKER_SCRIPT);
    for (let worker of await this.workers()) {
      let threads = Math.floor(worker.availableRam() / ramPerThread);
      if (threads <= 0) continue;

      let proc = new TK.Process(this.ns, {
        server: worker,
        script: WORKER_SCRIPT,
        args: [threads, this.queue.UUID, worker.name],
        scriptRam: ramPerThread,
        threads,
      });

      proc.run();
      this.procs.add(proc);
    }

    // Give the workers time to startup
    if (!wait) return;

    while (this.queue.workerCount() < this.procs.size) {
      await this.sleep(500);
    }
  }

  printTimes(name) {
    let weakenTime = round2(this.ns.getWeakenTime(name));
    let growTime = round2(this.ns.getGrowTime(name));
    let hackTime = round2(this.ns.getHackTime(name));

    this.tlog(`Weaken: ${weakenTime} Grow: ${growTime} Hack: ${hackTime}`);
  }

  async measure(fn, type, time) {
    let start = Date.now();
    await fn();
    let end = Date.now();

    this.tlog(`Type ${type} took ${(end - start) / 1000} expected: ${time}`);
  }

  readyToAttack(server) {
    if (server.money() < server.maxMoney() * 0.95) return false;
    if (server.security() > server.minSecurity() + 5) return false;
    return true;
  }
}

class DelayedAttack extends NSObject {
  constructor(
    ns,
    {startTime = 0, duration, type, threads, target, queue, threadManager}
  ) {
    super(ns);
    this.type = type;
    this.target = target;
    this.startTime = startTime;
    this.threads = threads;
    this.duration = duration;
    this.queue = queue;
    this.procs = [];
    this.running = false;
    this.started = false;

    if (!duration) throw new Error(`No duration`);

    if (!_.isNumber(this.threads) || this.threads <= 0) {
      throw new Error(
        `Started delayed attack with bad threads: ${this.threads}`
      );
    }

    this.threadManager = threadManager;
    threadManager.allocate(this);
  }

  endTime() {
    if (this.duration == null) {
      throw new Error(
        `Cannot ask end time for unknown duration delayed attack: ${this.info()}`
      );
    }

    return this.startTime + this.duration;
  }

  startDelay() {
    if (!this.started) return 0;
    return this.actualStart - this.startTime;
  }

  info() {
    let now = Date.now();
    let start = Math.floor((this.startTime - now) / 1000);
    let duration = Math.floor(this.duration / 1000);
    let running = this.running ? "Not Running" : "Running";
    let allocs = _.toArray(this.serverAllocs || [])
      .map(([server, threads]) => `${server}=${threads}`)
      .join(",");
    let end = round2((now - this.endTime()) / 1000);

    return `${this.type} T:${this.threads} ${allocs} S:${start} D:${duration} E:${end}`;
  }

  isRunning() {
    if (!this.started) return true;
    return this.running;
  }

  runIfTime(now, delay = 0) {
    if (this.started) return true;
    if (now > this.startTime + delay) {
      this.actualStart = now;
      this.run();
    }

    return true;
  }

  reclaim() {
    if (this.reclaimed) return;
    this.threadManager.reclaim(this);
    this.reclaimed = true;
  }

  hasStarted() {
    return this.started;
  }

  stopRun() {
    this.running = false;
    this.reclaim();
    let now = Date.now();

    let normalEnd = now - this.endTime();
    let actualEnd = now - this.actualStart - this.duration;

    if (DEBUG)
      this.log(
        `Stopped expected end: ${normalEnd} expected from start: ${actualEnd} diff: ${normalEnd -
          actualEnd} for ${this.target.name} ${this.info()}`
      );
  }

  run() {
    if (this.started) return false;
    this.started = true;
    this.running = true;

    if (Date.now() - this.startTime > 500 && this.type !== Request.WEAKEN) {
      this.running = false;
      this.reclaim();
      return;
    }

    if (DEBUG)
      this.log(
        `Started, expected: ${Date.now() - this.startTime} for ${this.info()}`
      );
    this.serverAllocs = this.queue.sendRequest(
      this.type,
      this.target.name,
      this.threads,
      () => this.stopRun()
    );
  }
}

class PodAttack extends NSObject {
  constructor(
    ns,
    {
      parent = null,
      startTime = null,
      priority = null,
      server,
      threadManager,
      queue,
      firstRun = false,
      canAttackHighSec = false,
    }
  ) {
    super(ns);
    if (!parent && startTime == null)
      throw new Error(`PodAttack needs parent or startTime`);

    this.parent = parent;

    if (this.parent) {
      this.startTime = this.parent.startTime + 2000;
    } else {
      this.startTime = startTime;
    }

    this.server = server;
    this.canAttackHighSec = canAttackHighSec;
    this.originalStartTime = startTime;
    this.priority = priority;
    this.queue = queue;
    this.firstRun = firstRun;

    let timings = server.attackTimings();
    this.hackTime = timings.hackTime;
    this.growTime = timings.growTime;
    this.weakenTime = timings.weakenTime;

    this.threadManager = threadManager;
    this.delayedAttacks = [];

    this.setupAttack();
  }

  maxStartDelay() {
    return this.delayedAttacks.reduce(
      (max, e) => Math.max(max, e.startDelay()),
      0
    );
  }

  get threads() {
    return this.delayedAttacks.reduce((sum, e) => sum + e.threads, 0);
  }

  reclaim() {
    this.delayedAttacks.forEach(a => a.reclaim());
  }

  firstEndTime() {
    return Math.min(...this.delayedAttacks.map(a => a.endTime()));
  }

  firstAttack() {
    if (this.parent) return this.parent.firstAttack();
    return this;
  }

  isValid(firstAttack) {
    return this.startTime < this.firstAttack().firstEndTime();
  }

  attackThreads(desiredThreads, securityCostPerThread) {
    let attackThreads = desiredThreads;
    let weakenThreads = Math.ceil(
      (attackThreads * securityCostPerThread) / WEAKEN_SECURITY_HEAL
    );

    let maxThreads = this.threadManager.availableThreads();
    if (maxThreads < attackThreads + weakenThreads) {
      // First assign weaken threads for min weaken
      weakenThreads = this.server.threadsForMinWeaken();
      maxThreads -= weakenThreads;

      let weakenThreadsPerAttack = securityCostPerThread / WEAKEN_SECURITY_HEAL;
      // Attack as much as possible while still weakening
      attackThreads = Math.max(
        0,
        Math.floor(maxThreads / (1 + weakenThreadsPerAttack))
      );
      weakenThreads += Math.ceil(attackThreads * weakenThreadsPerAttack);
    }

    if (weakenThreads <= 0 && desiredThreads > 0) {
      throw new Error(
        `Computed 0 or less weaken threads for attack? ${weakenThreads}, D:${desiredThreads}, available: ${this.threadManager.availableThreads()}`
      );
    }

    return {
      attackThreads,
      weakenThreads,
      fullRun: desiredThreads === attackThreads,
    };
  }

  setupGrow() {
    let growThreads = this.server.threadsForGrowth(2);
    let maxGrow = this.server.threadsForMaxGrowth();
    if (maxGrow * 0.95 > growThreads) growThreads = maxGrow;

    let {attackThreads, weakenThreads, fullRun} = this.attackThreads(
      growThreads,
      GROW_SECURITY_COST
    );

    if (attackThreads > 0) {
      this.delayedAttacks.push(
        new DelayedAttack(this.ns, {
          queue: this.queue,
          startTime: this.startGrowTime(),
          type: Request.GROW,
          threads: attackThreads,
          target: this.server,
          duration: this.growTime,
          podAttack: this,
          threadManager: this.threadManager,
        })
      );
    }

    if (weakenThreads > 0) {
      this.delayedAttacks.push(
        new DelayedAttack(this.ns, {
          queue: this.queue,
          startTime: this.startWeakenGrowTime(),
          type: Request.WEAKEN,
          duration: this.weakenTime,
          threads: weakenThreads,
          target: this.server,
          podAttack: this,
          threadManager: this.threadManager,
        })
      );
    }

    return fullRun;
  }

  // Must be called after setupGrow
  setupHack() {
    if (this.firstRun) {
      if (this.server.maxMoney() * 0.95 > this.server.money()) {
        return true;
      } else if (!this.server.hasLowSecurity()) {
        return true;
      }
    }

    let {attackThreads, weakenThreads, fullRun} = this.attackThreads(
      this.server.threadsForHack(0.5),
      HACK_SECURITY_COST
    );

    if (attackThreads > 0) {
      this.delayedAttacks.push(
        new DelayedAttack(this.ns, {
          queue: this.queue,
          priority: this.priority,
          startTime: this.startHackTime(),
          type: Request.HACK,
          threads: attackThreads,
          target: this.server,
          duration: this.hackTime,
          podAttack: this,
          threadManager: this.threadManager,
        })
      );
    }

    if (weakenThreads > 0) {
      this.delayedAttacks.push(
        new DelayedAttack(this.ns, {
          queue: this.queue,
          priority: this.priority,
          startTime: this.startWeakenHackTime(),
          type: Request.WEAKEN,
          duration: this.weakenTime,
          threads: weakenThreads,
          target: this.server,
          podAttack: this,
          threadManager: this.threadManager,
        })
      );
    }

    return fullRun;
  }

  setupOnlyWeaken() {
    if (this.server.hasLowSecurity()) return true;

    let desiredThreads = this.server.threadsForMinWeaken();
    let threads = Math.min(
      desiredThreads,
      this.threadManager.availableThreads()
    );

    this.delayedAttacks.push(
      new DelayedAttack(this.ns, {
        queue: this.queue,
        priority: this.priority,
        startTime: this.startTime,
        type: Request.WEAKEN,
        duration: this.weakenTime,
        target: this.server,
        podAttack: this,
        threadManager: this.threadManager,
        threads,
      })
    );

    this.startTime += 500;

    return threads === desiredThreads;
  }

  setupAttack() {
    let fullRun = this.setupOnlyWeaken();

    if (fullRun) fullRun = this.setupGrow();
    if (fullRun) fullRun = this.setupHack();

    this.fullRun = fullRun;
    return fullRun;
  }

  isRunning() {
    return this.delayedAttacks.some(a => a.isRunning());
  }

  run(time) {
    if (!this.parent) {
      this.delayedAttacks.forEach(a => a.runIfTime(time));
      return;
    }

    if (!this.parent.hasStarted()) return;
    let delay = this.maxStartDelay();
    this.delayedAttacks.forEach(a => a.runIfTime(time, delay));
  }

  hasStarted() {
    return this.delayedAttacks.some(a => a.started);
  }

  maxDuration() {
    return this.delayedAttacks.reduce((max, a) => Math.max(max, a.duration), 0);
  }

  isTooFarFuture(now) {
    let duration = this.maxDuration();
    let result = this.startTime > now + duration * 1.1;

    if (DEBUG) {
      if (result) {
        this.log(`Pod is too far forward!`);
      } else {
        this.log(
          `not too far future S:${this.startTime} D:${duration} N:${now}`
        );
      }
    }

    return result;
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

  infos() {
    return this.delayedAttacks.map(
      a => `Pod T:${this.server.name} ${a.info()}`
    );
  }

  info() {
    let infos = this.delayedAttacks.map(a => a.info());
    return infos.join(" | ");
  }
}

class ThreadManager extends NSObject {
  constructor(ns, queue) {
    super(ns);
    this.queue = queue;
    this.allocatedThreads = 0;
  }

  availableThreads() {
    return this.queue.maxThreads - this.allocatedThreads;
  }

  canAllocate(pod) {
    return pod.threads < this.availableThreads();
  }

  allocate(attack) {
    if (attack.threads > this.availableThreads()) {
      throw new Error(
        `Cannot allocate ${
          attack.threads
        }, only have ${this.availableThreads()}`
      );
    }

    this.allocatedThreads += attack.threads;
  }

  reclaim(attack) {
    this.allocatedThreads -= attack.threads;
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

let RAM_SCRIPT_CACHE = {};
function scriptRam(ns, script) {
  if (!(script in RAM_SCRIPT_CACHE)) {
    RAM_SCRIPT_CACHE[script] = ns.getScriptRam(script);
  }
  return RAM_SCRIPT_CACHE[script];
}

export let main = ThisScript.runner();
