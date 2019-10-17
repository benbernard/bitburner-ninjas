import * as TK from "./tk.js";
import {NSObject} from "./baseScript.js";

const GROW_SCRIPT = "minimal-grow.js";
const WEAKEN_SCRIPT = "minimal-weaken.js";
const HACK_SCRIPT = "minimal-hack.js";

const STATUS_FILE = "firestorm-status.txt";

class ThisScript extends TK.Script {
  async allServers() {
    let servers = await this.home.reachableServers({}, true);
    let home = servers.find(s => s.name === "home");
    home.maxRamUsedPercentage = 0.75;
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
    return this.ns.getTimeSinceLastAug();
  }

  async prepareAll() {
    await this.nukeServers();
    let servers = await this.allServers();
    servers = servers.filter(s => s.maxMoney() > 0);

    let workers = await this.workers();

    let now = this.now();

    let attacks = [];
    let count = 0;
    for (let server of servers) {
      if (this.readyToAttack(server)) continue;
      count++;
      if (count > 1) break;
      let newAttack = new PodAttack(this.ns, {
        mode: "prepare",
        server,
        startTime: now,
        timings: server.hackTimings(),
      });

      newAttack.run(now, workers, []);
      attacks.push(newAttack);
    }

    this.tlog(`Running ${attacks.length} prep jobs`);
    this.ns.tail();

    if (attacks.length === 0) {
      this.tlog(`Done preparing`);
      return;
    }

    while (true) {
      await this.sleep(1000);

      if (attacks.some(a => a.isRunning())) {
        continue;
      } else {
        break;
      }
    }

    this.tlog(`Done preparing`);
  }

  updateStatus() {
    let infos = {};

    for (let target of Object.keys(this.attacks)) {
      infos[target] = [];
      for (let attack of this.attacks[target]) {
        infos[target].push(...attack.infos());
      }
    }

    let content = JSON.stringify(infos, null, 2);
    this.ns.write(STATUS_FILE, content, "w");
  }

  addPodAttack(attack) {
    let target = attack.server.name;
    if (!(target in this.attacks)) {
      this.attacks[target] = [];
    }

    this.attacks[target].push(attack);
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

  async startAttacks(now) {
    let servers = await this.serversToAttack();

    let priority = 0;
    for (let server of servers) {
      priority += 1000;
      let serverName = server.name;

      // Skip if we are already attacking
      let attacks = this.attacks[serverName];
      if (attacks && attacks.length > 0) continue;

      if (this.readyToAttack(server)) {
        this.createFullPodAttack(server, priority, now);
        break;
      } else {
        this.addPodAttack(
          new PodAttack(this.ns, {
            mode: "prepare",
            server,
            priority,
            startTime: now,
            timings: server.hackTimings(),
          })
        );
      }
    }
  }

  allDelayedAttacks() {
    let delayedAttacks = [];
    for (let target of Object.keys(this.attacks)) {
      for (let attack of this.attacks[target]) {
        delayedAttacks.push(...attack.delayedAttacks);
      }
    }

    return delayedAttacks;
  }

  * podAttacks() {
    for (let podAttacks of Object.values(this.attacks)) {
      for (let attack of podAttacks) {
        yield attack;
      }
    }
  }

  async runAttacks(time) {
    let workers = await this.workers();

    let delayedAttacks = this.allDelayedAttacks();

    for (let attack of this.podAttacks()) {
      attack.run(time, workers, delayedAttacks);
    }
  }

  cleanupAttacks() {
    let removedAttacks = false;
    for (let target of Object.keys(this.attacks)) {
      let attacks = this.attacks[target];
      this.attacks[target] = attacks.filter(a => a.isRunning());
      if (attacks.length > this.attacks[target].length) removedAttacks = true;
    }
    return removedAttacks;
  }

  async hasFreeRam() {
    let workers = await this.workers();
    return workers.reduce((sum, s) => {
      let available = s.availableRam();
      if (available >= 5) {
        return available + sum;
      } else {
        return sum;
      }
    }, 0);
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

    this.attacks = {};

    await this.startAttacks(this.now());

    while (true) {
      clearProcRunningCache();
      let now = this.now();
      let removed = this.cleanupAttacks();
      // if (removed) {
      //   await this.startAttacks(now);
      // }

      await this.runAttacks(now);
      this.updateStatus();

      await this.sleep(50);
    }
  }

  createFullPodAttack(server, priority, startTime) {
    let hackThreads = server.threadsForHack(0.5);
    let growThreads = Math.ceil(server.threadsForGrowth(2));

    priority++;

    let timings = server.hackTimings();

    const createAttack = (parent, priority) => {
      return new PodAttack(this.ns, {
        parent,
        startTime,
        priority,
        hackThreads,
        growThreads,
        server,
        timings,
      });
    };

    const firstAttack = createAttack(null, priority);
    this.addPodAttack(firstAttack);

    let lastAttack = firstAttack;

    let count = 0;
    while (true) {
      count++;
      if (count > 900) {
        this.tlog(`Manual break on creating ${server.name} pod attacks?`);
        this.tlog("First end time: " + firstAttack.firstEndTime());
        this.tlog(`Last attack:`);
        this.tlog(lastAttack.infos(startTime).join("\n"));
        this.tlog(`Timings: ${JSON.stringify(timings, null, 2)}`);
        break;
      }

      priority++;
      let newAttack = createAttack(lastAttack, priority);
      if (newAttack.isValid(firstAttack)) {
        this.addPodAttack(newAttack);
        lastAttack = newAttack;
      } else {
        break;
      }
    }
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
}

class DelayedAttack extends NSObject {
  constructor(
    ns,
    {
      priority,
      startTime = 0,
      duration = "unknown",
      script,
      threads,
      args,
      podAttack,
    }
  ) {
    super(ns);
    this.priority = priority;
    this.script = script;
    this.args = args;
    this.startTime = startTime;
    this.threads = threads;
    this.duration = duration;
    this.podAttack = podAttack;
    this.procs = [];

    if (this.threads === 0) {
      this.dead = true;
    } else {
      this.dead = false;
    }
  }

  endTime() {
    if (this.duration === "unknown") {
      throw new Error(
        `Cannot ask end time for unknown duration delayed attack: ${this.info()}`
      );
    }

    return this.startTime + this.duration;
  }

  info() {
    return `DelayedAttack ${this.script} P:${this.priority} T:${this.threads} Start:${this.startTime} Duration: ${this.duration}`;
  }

  runIfTime(now, workers, otherAttacks) {
    if (this.dead || this.procs.length > 0) return true;
    if (now > this.startTime) {
      return this.run(workers, otherAttacks);
    }

    return true;
  }

  isRunning() {
    if (this.dead) return false;
    if (this.procs.length === 0) return true;
    return this.procs.some(p => procIsRunning(p));
  }

  ram() {
    return this.ramPerThread() * this.threads;
  }

  ramPerThread() {
    return scriptRam(this.ns, this.script);
  }

  hasStarted() {
    if (this.dead) return true;
    return this.procs.length > 0;
  }

  orderedWorkers(servers, availableRamMap) {
    if (!availableRamMap) {
      availableRamMap = {};
      servers.forEach(s => (availableRamMap[s.name] = s.availableRam()));
    }

    return servers
      .filter(s => availableRamMap[s.name])
      .sort((a, b) => {
        if (a.isPurchased() && !b.isPurchased()) {
          return -1;
        } else if (!a.isPurchased() && b.isPurchased()) {
          return 1;
        } else {
          return availableRamMap[a.name] - availableRamMap[b.name];
        }
      });
  }

  fillFreeSpace(servers, unallocatedThreads = this.threads) {
    let ramPerThread = this.ramPerThread();

    let procs = [];
    for (let server of this.orderedWorkers(servers)) {
      let threadsOnServer = Math.floor(server.availableRam() / ramPerThread);
      let runThreads = Math.min(threadsOnServer, unallocatedThreads);
      if (runThreads === 0) continue;

      procs.push(this.createProc(runThreads, server));
      unallocatedThreads -= runThreads;
      if (unallocatedThreads <= 0) break;
    }

    return procs;
  }

  createProc(threads, server) {
    return new TK.Process(this.ns, {
      server,
      script: this.script,
      threads,
      args: this.args,
      scriptRam: scriptRam(this.ns, this.script),
    });
  }

  buildAvailableRamMap(servers, otherAttacks = null) {
    let attackRam = {};

    if (otherAttacks) {
      for (let attack of otherAttacks) {
        for (let proc of attack.procs) {
          if (!procIsRunning(proc)) continue;
          let serverName = proc.server.name;
          if (!(serverName in attackRam))
            attackRam[serverName] = proc.server.attackRam();
          attackRam[serverName] += proc.ram();
        }
      }
    }

    let availableRam = {};
    for (let server of servers) {
      if (server.name in attackRam) {
        availableRam[server.name] = attackRam[server.name];
      } else {
        availableRam[server.name] = server.availableRam();
      }
    }

    return availableRam;
  }

  possibleToRun(servers, otherAttacks, unallocatedThreads) {
    let availableRamMap = this.buildAvailableRamMap(servers, otherAttacks);

    let ramPerThread = this.ramPerThread();
    for (let server of this.orderedWorkers(servers, availableRamMap)) {
      let serverRam = availableRamMap[server.name];

      let threadsOnServer = Math.floor(serverRam / ramPerThread);
      let runThreads = Math.min(threadsOnServer, unallocatedThreads);
      unallocatedThreads -= runThreads;
      if (unallocatedThreads <= 0) break;
    }

    return unallocatedThreads <= 0;
  }

  evictAndRun(servers, otherAttacks, unallocatedThreads) {
    if (unallocatedThreads === 0) return [];

    let sorted = otherAttacks.sort((a, b) => b.priority - a.priority);

    let procs = [];
    for (let attack of sorted) {
      let freedServers = attack.procServers();
      attack.kill();

      let newProcs = this.fillFreeSpace(freedServers, unallocatedThreads);
      let allocatedThreads = newProcs.reduce((sum, p) => sum + p.threads, 0);
      unallocatedThreads -= allocatedThreads;
      procs.push(...newProcs);

      if (unallocatedThreads === 0) break;
    }

    if (unallocatedThreads < 0) {
      throw new Error(`Overallocated threads: ${unallocatedThreads}`);
    }

    if (unallocatedThreads > 0) {
      throw new Error(
        `EvictAndRun can't allocate all threads! Left Over: ${unallocatedThreads}`
      );
    }

    return procs;
  }

  procServers() {
    let servers = new Set();
    for (let proc of this.procs) {
      servers.add(proc.server);
    }

    return [...servers];
  }

  kill() {
    if (this.dead) return;

    this.procs.forEach(p => p.kill());
    this.procs = [];
    this.dead = true;
    if (this.podAttack) this.podAttack.kill();
  }

  isDead() {
    return this.dead;
  }

  run(servers, otherAttacks) {
    otherAttacks = otherAttacks.filter(
      attack => attack.priority > this.priority
    );

    servers = servers.filter(s => !s.isDying());

    let unallocatedThreads = this.threads;
    if (!this.possibleToRun(servers, otherAttacks, unallocatedThreads)) {
      return false;
    }

    let procs = this.fillFreeSpace(servers, unallocatedThreads);
    procs.forEach(p => (unallocatedThreads -= p.threads));

    let evictionProcs = [];
    if (unallocatedThreads > 0) {
      evictionProcs = this.evictAndRun(
        servers,
        otherAttacks,
        unallocatedThreads
      );
    }

    this.procs = [...procs, ...evictionProcs];
    this.procs.forEach(p => p.run());
    return true;
  }
}

class PodAttack extends NSObject {
  constructor(
    ns,
    {
      parent = null,
      hackThreads = 0,
      growThreads = 0,
      mode = "attack",
      startTime = null,
      priority = null,
      server,
      timings,
    }
  ) {
    super(ns);
    if (!parent && startTime == null)
      throw new Error(`PodAttack needs parent or startTime`);
    if (mode !== "attack" && mode !== "prepare")
      throw new Error(`Unrecognized PodAttack mode: ${mode}`);

    this.parent = parent;

    if (this.parent) {
      this.startTime = this.parent.startTime + 2000;
    } else {
      this.startTime = startTime;
    }

    this.dead = false;
    this.server = server;
    this.originalStartTime = startTime;
    this.hackThreads = hackThreads;
    this.growThreads = growThreads;
    this.priority = priority;

    this.hackTime = timings.hackTime;
    this.growTime = timings.growTime;
    this.weakenTime = timings.weakenTime;

    if (mode === "attack") {
      this.setupAttack();
    } else if (mode === "prepare") {
      this.setupPrepare();
    }
  }

  firstEndTime() {
    return Math.min(...this.delayedAttacks.map(a => a.endTime()));
  }

  isValid(firstAttack) {
    return this.startTime < firstAttack.firstEndTime();
  }

  setupPrepare() {
    let growThreads = this.server.threadsForMaxGrowth();

    this.delayedAttacks = [
      new DelayedAttack(this.ns, {
        priority: this.priority,
        startTime: 0,
        script: GROW_SCRIPT,
        threads: growThreads,
        args: [this.server.name, 0],
        duration: this.growTime,
        podAttack: this,
      }),
      new DelayedAttack(this.ns, {
        priority: this.priority,
        startTime: 0,
        script: WEAKEN_SCRIPT,
        duration: this.weakenTime,
        threads: this.server.threadsForMinWeaken({extraGrow: growThreads}),
        args: [this.server.name],
        podAttack: this,
      }),
    ];
  }

  setupAttack() {
    this.weakenGrowThreads = Math.ceil((this.growThreads * 0.004) / 0.05);
    this.weakenHackThreads = Math.ceil((this.hackThreads * 0.002) / 0.05);

    this.delayedAttacks = [
      new DelayedAttack(this.ns, {
        priority: this.priority,
        script: WEAKEN_SCRIPT,
        threads: this.weakenHackThreads,
        args: [this.server.name],
        startTime: this.startWeakenHackTime(),
        duration: this.weakenTime,
        podAttack: this,
      }),
      new DelayedAttack(this.ns, {
        priority: this.priority,
        script: WEAKEN_SCRIPT,
        threads: this.weakenGrowThreads,
        startTime: this.startWeakenGrowTime(),
        args: [this.server.name],
        duration: this.weakenTime,
        podAttack: this,
      }),
      new DelayedAttack(this.ns, {
        priority: this.priority,
        startTime: this.startHackTime(),
        script: HACK_SCRIPT,
        threads: this.hackThreads,
        args: [this.server.name, 0],
        duration: this.hackTime,
        podAttack: this,
      }),
      new DelayedAttack(this.ns, {
        priority: this.priority,
        startTime: this.startGrowTime(),
        script: GROW_SCRIPT,
        threads: this.growThreads,
        args: [this.server.name, 0],
        duration: this.growTime,
        podAttack: this,
      }),
    ];
  }

  run(time, servers, otherAttacks) {
    for (let attack of this.delayedAttacks) {
      let successfullyRun = attack.runIfTime(time, servers, otherAttacks);
      if (!successfullyRun) {
        this.kill();
        return;
      }
    }
  }

  kill() {
    this.dead = true;
    this.delayedAttacks.forEach(a => a.kill());
  }

  isRunning() {
    if (this.dead) return false;
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

  infos() {
    return this.delayedAttacks.map(
      a => `Pod T:${this.server.name} P:${this.priority} ${a.info()}`
    );
  }

  info() {
    if (this.mode === "attack") {
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
    } else {
      let infos = this.delayedAttacks.map(a => a.info());
      return infos.join(" | ");
    }
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

let RUNNING_CACHE = {};
function clearProcRunningCache() {
  RUNNING_CACHE = {};
}

function procIsRunning(proc) {
  if (!(proc.UUID in RUNNING_CACHE)) {
    RUNNING_CACHE[proc.UUID] = proc.isRunning();
  }
  return RUNNING_CACHE[proc.UUID];
}

let RAM_SCRIPT_CACHE = {};
function scriptRam(ns, script) {
  if (!(script in RAM_SCRIPT_CACHE)) {
    RAM_SCRIPT_CACHE[script] = ns.getScriptRam(script);
  }
  return RAM_SCRIPT_CACHE[script];
}

export let main = ThisScript.runner();
