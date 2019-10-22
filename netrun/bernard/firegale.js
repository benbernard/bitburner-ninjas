import * as TK from "./tk.js";
import {NSObject, _, json} from "./baseScript.js";

const GROW_SCRIPT = "minimal-grow.js";
const WEAKEN_SCRIPT = "minimal-weaken.js";
const HACK_SCRIPT = "minimal-hack.js";

const STATUS_FILE = "firegale-status.txt";

const DEBUG = false;

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
    return this.ns.getTimeSinceLastAug();
  }

  async prepareAll() {
    await this.nukeServers();
    let servers = await this.allServers();
    servers = servers.filter(s => s.maxMoney() > 0);

    let workers = await this.workers();

    let now = this.now();

    let attacks = [];
    let ramManager = new RamManager(this.ns);
    ramManager.setServers(workers);
    for (let server of servers) {
      if (this.readyToAttack(server)) continue;
      let newAttack = new PodAttack(this.ns, {
        mode: "prepare",
        server,
        startTime: now,
        timings: server.hackTimings(),
        ramManager,
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

    let content = json(infos, null, 2);
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

  async startAttacks(now, ramManager) {
    let servers = await this.serversToAttack();

    let priority = 0;
    for (let server of servers) {
      priority += 1000;
      let serverName = server.name;

      // Skip if we are already attacking
      let attacks = this.attacks[serverName];
      if (attacks && attacks.length > 0) continue;

      if (this.readyToAttack(server)) {
        let full = this.createFullPodAttack(server, priority, now, ramManager);
        if (full) {
          return;
        }
      } else {
        let prepAttack = new PodAttack(this.ns, {
          mode: "prepare",
          server,
          priority,
          startTime: now,
          timings: server.hackTimings(),
          ramManager,
        });

        if (prepAttack.dead) {
          return;
        }

        this.addPodAttack(prepAttack);
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

    let ramManager = new RamManager(this.ns);
    let workers = await this.workers();
    ramManager.setServers(workers);
    await this.startAttacks(this.now(), ramManager);
    this.log(`have pod attacks: ${this.countPodAttacks()}`);

    while (true) {
      try {
        let workers = await this.workers();
        clearProcRunningCache();
        ramManager.setServers(workers);

        let now = this.now();
        let removed = this.cleanupAttacks();
        if (removed) {
          await this.startAttacks(now, ramManager);
          this.log(`have pod attacks: ${this.countPodAttacks()}`);
        }

        await this.runAttacks(now);
        this.updateStatus();
      } catch (e) {
        if (e instanceof String && e.indexOf("Invalid IP or hostname") !== -1) {
          this.log(`Caught ${e}, ignoring`);
        } else {
          throw e;
        }
      }

      await this.sleep(100);
    }
  }

  countPodAttacks() {
    let count = 0;
    for (let attack of this.podAttacks()) {
      count++;
    }
    return count;
  }

  createFullPodAttack(server, priority, startTime, ramManager) {
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
        ramManager,
      });
    };

    const firstAttack = createAttack(null, priority);
    if (firstAttack.dead) return true;
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
      if (!newAttack.dead && newAttack.isValid(firstAttack)) {
        this.addPodAttack(newAttack);
        lastAttack = newAttack;
      } else {
        break;
      }
    }

    if (lastAttack.dead) return true;
    return false;
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
      duration = null,
      script,
      threads,
      args,
      podAttack,
      ramManager,
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
      throw new Error(`Started delayed attack with 0 threads?`);
    } else {
      this.dead = false;
    }

    this.ramManager = ramManager;
    this.scheduledThreads = ramManager.scheduleAttack(this);
    if (this.scheduledThreads === false) {
      this.dead = true;
    } else if (DEBUG)
      this.log(`Scheduling: ${this.info()}: ${this.scheduleInfo()}`);
  }

  scheduleInfo() {
    if (this.scheduledThreads === false) return "No threads scheduled";
    let info = {};
    for (let [server, data] of _.hashEach(this.scheduledThreads)) {
      info[server] = [data.threads, data.threads * this.ramPerThread()];
    }

    return json(info);
  }

  endTime() {
    if (this.duration == null) {
      throw new Error(
        `Cannot ask end time for unknown duration delayed attack: ${this.info()}`
      );
    }

    return this.startTime + this.duration;
  }

  info() {
    let now = this.ns.getTimeSinceLastAug();
    let start = Math.floor((this.startTime - now) / 1000);
    let duration = Math.floor(this.duration / 1000);

    let threadInfo = [];
    for (let serverName of Object.keys(this.scheduledThreads)) {
      let info = this.scheduledThreads[serverName];
      threadInfo.push(`${serverName}=${info.threads}`);
    }

    return `DelayedAttack ${this.script} P:${this.priority} T:${
      this.threads
    } S:${start} D:${duration} Scheudled:${threadInfo.join(",")}`;
  }

  runIfTime(now, workers, otherAttacks) {
    if (this.dead || this.procs.length > 0) return true;
    if (now > this.startTime) {
      return this.run(workers, otherAttacks);
    }

    return true;
  }

  reclaim() {
    if (this.reclaimed) return;
    if (DEBUG)
      this.log(
        `Reclaiming ${this.info()} procs: ${this.procs
          .map(p => p.UUID)
          .join(",") || "[]"} ${this.scheduleInfo()}`
      );
    if (this.scheduledThreads) {
      this.ramManager.reclaim(this.scheduledThreads, this.ramPerThread());
    }
    this.reclaimed = true;
  }

  isRunning() {
    let running = this._isRunning();
    if (!running) this.reclaim();
    return running;
  }

  _isRunning() {
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

  threadsForRam(ram) {
    return Math.floor(ram / this.ramPerThread());
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
    this.reclaim();
    if (this.podAttack) this.podAttack.kill();
  }

  isDead() {
    return this.dead;
  }

  createProc(threads, server) {
    return new TK.Process(this.ns, {
      server,
      script: this.script,
      threads,
      args: this.args,
      scriptRam: scriptRam(this.ns, this.script),
      duration: this.duration,
    });
  }

  run() {
    if (this.dead) return false;

    this.procs = [];
    for (let name of Object.keys(this.scheduledThreads)) {
      let info = this.scheduledThreads[name];
      this.procs.push(this.createProc(info.threads, info.server));
    }

    for (let proc of this.procs) {
      try {
        proc.run();
      } catch (e) {
        this.log(`ERROR Info: ${e.stack}`);
        this.log(`Ram manager: ${json(this.ramManager.serverRam)}`);
        this.log(this.scheduleInfo());
        if (DEBUG) this.ramManager.dumpLog(proc.server);

        throw e;
      }
    }

    return true;
  }

  runningRam({podRam = true} = {}) {
    if (podRam && this.podAttack) {
      return this.podAttack.runningRam();
    }

    return this.procs
      .filter(p => procIsRunning(p))
      .reduce((sum, p) => sum + p.ram(), 0);
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
      ramManager,
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

    this.ramManager = ramManager;

    if (mode === "attack") {
      this.setupAttack();
    } else if (mode === "prepare") {
      this.setupPrepare();
    }

    if (this.anyAttackIsDead()) {
      this.dead = true;
      this.kill();
    }
  }

  anyAttackIsDead() {
    return this.delayedAttacks.some(a => a.dead);
  }

  reclaim() {
    this.delayedAttacks.forEach(a => a.reclaim());
  }

  firstEndTime() {
    return Math.min(...this.delayedAttacks.map(a => a.endTime()));
  }

  isValid(firstAttack) {
    return this.startTime < firstAttack.firstEndTime();
  }

  setupPrepare() {
    let growThreads = this.server.threadsForMaxGrowth();

    this.delayedAttacks = [];
    if (growThreads > 0) {
      this.delayedAttacks.push(
        new DelayedAttack(this.ns, {
          priority: this.priority,
          startTime: this.startTime,
          script: GROW_SCRIPT,
          threads: growThreads,
          args: [this.server.name, 1],
          duration: this.growTime,
          podAttack: this,
          ramManager: this.ramManager,
        })
      );
    }

    let weakenThreads = this.server.threadsForMinWeaken({
      extraGrow: growThreads,
    });

    if (weakenThreads > 0) {
      this.delayedAttacks.push(
        new DelayedAttack(this.ns, {
          priority: this.priority,
          startTime: this.startTime,
          script: WEAKEN_SCRIPT,
          duration: this.weakenTime,
          threads: this.server.threadsForMinWeaken({extraGrow: growThreads}),
          args: [this.server.name],
          podAttack: this,
          ramManager: this.ramManager,
        })
      );
    }
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
        ramManager: this.ramManager,
      }),
      new DelayedAttack(this.ns, {
        priority: this.priority,
        script: WEAKEN_SCRIPT,
        threads: this.weakenGrowThreads,
        startTime: this.startWeakenGrowTime(),
        args: [this.server.name],
        duration: this.weakenTime,
        podAttack: this,
        ramManager: this.ramManager,
      }),
      new DelayedAttack(this.ns, {
        priority: this.priority,
        startTime: this.startHackTime(),
        script: HACK_SCRIPT,
        threads: this.hackThreads,
        args: [this.server.name, 0],
        duration: this.hackTime,
        podAttack: this,
        ramManager: this.ramManager,
      }),
      new DelayedAttack(this.ns, {
        priority: this.priority,
        startTime: this.startGrowTime(),
        script: GROW_SCRIPT,
        threads: this.growThreads,
        args: [this.server.name, 1],
        duration: this.growTime,
        podAttack: this,
        ramManager: this.ramManager,
      }),
    ];
  }

  run(time, servers, otherAttacks) {
    for (let attack of this.delayedAttacks) {
      let successfullyRun = attack.runIfTime(time, servers, otherAttacks);
      if (!successfullyRun) {
        this.log(`Killing after runIfTime`);
        this.kill();
        return;
      }
    }
  }

  kill() {
    this.dead = true;
    this.delayedAttacks.forEach(a => a.kill());
    this.reclaim();
  }

  isRunning() {
    if (this.dead) return false;
    for (let attack of this.delayedAttacks) {
      if (attack.isRunning()) return true;
    }

    return false;
  }

  runningRam() {
    return this.delayedAttacks.reduce(
      (sum, attack) => sum + attack.runningRam({podRam: false}),
      0
    );
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

class RamManager extends NSObject {
  constructor(ns) {
    super(ns);
    this.serverRam = {};
    this.cacheStart = this.ns.getTimeSinceLastAug();
    this.eventLog = new Map();
  }

  addLogEvent(event, server) {
    if (!DEBUG) return;
    let events = this.eventLog.get(server.name) || [];
    events.push(event);
    if (!this.eventLog.has(server.name)) this.eventLog.set(server.name, events);
  }

  dumpLog(server) {
    if (!this.eventLog.has(server.name))
      return this.log("Tried to dump ${server.name}, but no events!");
    this.log(
      `Dumping event log for: ${server.name}:\n` +
        this.eventLog.get(server.name).join("\n")
    );
  }

  setServers(servers) {
    let now = this.ns.getTimeSinceLastAug();
    let recheckTotals = this.cacheStart + 300000 < now;

    for (let server of servers) {
      let info = {};
      let dying = server.isDying();
      let oldDying = info.dying;

      if (server.name in this.serverRam) {
        info = this.serverRam[server.name];
        if (dying !== oldDying) {
          this.addLogEvent(
            `Changing dying status for ${server.name} to: ${dying}`,
            server
          );
        }

        info.dying = dying;
        if (recheckTotals || dying !== oldDying) {
          let totalRam = server.ram();

          // Did the server grow because of a purchase action?
          if (totalRam > info.total) {
            let oldTotal = info.total;
            info.available += totalRam - info.total;
            info.total = totalRam;
            this.addLogEvent(
              `Increasing total ram on ${server.name} from ${oldTotal} to ${totalRam}, A: ${info.available}`,
              server
            );
          }
        }
      } else {
        let [total, used] = server.ramInfo();
        let available = total - used;

        info = {
          available,
          total,
          dying,
        };

        this.addLogEvent(
          `Setting ram info for ${server.name}, dying: ${dying} t: ${total} A: ${available}`,
          server
        );
      }

      this.serverRam[server.name] = info;
    }

    this.servers = servers;
    if (recheckTotals) this.cacheStart = this.ns.getTimeSinceLastAug();

    this.sortServers();
    this.selectServer(0);
  }

  getAvailableRam(server) {
    if (server.name in this.serverRam) {
      let info = this.serverRam[server.name];
      if (info.dying) return 0;
      return Math.max(info.available - 1, 0); // add padding for floating point errors
    } else {
      throw new Error(`Unkown server in getAvailableRam: ${server.name}`);
    }
  }

  selectServer(index) {
    this.selectedServerIndex = index;
    this.selectedServer = this.servers[index];
    return this.selectedServer;
  }

  selectNextServer() {
    let index = this.selectedServerIndex + 1;
    if (index < this.servers.length) {
      return this.selectServer(index);
    } else {
      this.sortServers();
      return this.selectServer(0);
    }
  }

  sortServers() {
    this.servers = this.servers.sort((a, b) => {
      if (a.isPurchased() && !b.isPurchased()) {
        return -1;
      } else if (!a.isPurchased() && b.isPurchased()) {
        return 1;
      } else {
        return this.getAvailableRam(b) - this.getAvailableRam(a);
      }
    });
  }

  threadsForServers(ramPerThread) {
    let threads = 0;
    for (let server of this.servers) {
      let available = this.getAvailableRam(server);
      threads += Math.floor(available / ramPerThread);
    }
    return threads;
  }

  reclaim(scheduledThreads, ramPerThread) {
    for (let info of Object.values(scheduledThreads)) {
      let server = info.server;
      if (!(server.name in this.serverRam)) continue;

      this.incrementRam(server, info.threads * ramPerThread);
      this.addLogEvent(
        `Reclaiming ${info.threads} R:${info.threads * ramPerThread} to ${
          server.name
        } A: ${this.getAvailableRam(server)}`,
        server
      );
    }
  }

  incrementRam(server, by) {
    let info = this.serverRam[server.name];
    info.available += by;
  }

  scheduleAttack(delayedAttack) {
    let unallocatedThreads = delayedAttack.threads;
    let ramPerThread = delayedAttack.ramPerThread();
    if (this.threadsForServers(ramPerThread) < unallocatedThreads) {
      this.log(`RamManager: out of ram`);
      return false;
    }

    let currentServer = this.selectedServer;

    let serversToThreads = {};
    while (true) {
      let availableThreads = Math.floor(
        this.getAvailableRam(currentServer) / ramPerThread
      );

      if (availableThreads > 0) {
        let allocatedThreads = Math.min(availableThreads, unallocatedThreads);
        unallocatedThreads -= allocatedThreads;

        serversToThreads[currentServer.name] = {
          threads: allocatedThreads,
          server: currentServer,
        };

        this.incrementRam(currentServer, allocatedThreads * ramPerThread * -1);

        this.addLogEvent(
          `Allocating ${allocatedThreads} R:${allocatedThreads *
            ramPerThread} to ${currentServer.name} A: ${this.getAvailableRam(
            currentServer
          )}`,
          currentServer
        );
      }

      if (unallocatedThreads > 0) {
        currentServer = this.selectNextServer();
        if (currentServer.name in serversToThreads) {
          break;
        }
      } else {
        break;
      }
    }

    if (unallocatedThreads > 0) {
      throw new Error(
        `Unable to allocate all threads: ${unallocatedThreads}, wanted: ${
          delayedAttack.threads
        }, threadsForServers: ${this.threadsForServers(
          ramPerThread
        )}, ramPerThread: ${ramPerThread}?`
      );
    }

    return serversToThreads;
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
    let running = false;
    try {
      running = proc.isRunning();
    } catch (e) {
      running = false;
    }

    RUNNING_CACHE[proc.UUID] = running;
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
