import BaseScript from "./baseScript.js";
import {_, json} from "./utils.js";
import {Queue, TrackablePromise, Request} from "./workerQueue.js";

export let masterQueue = new Queue();

class ThisScript extends BaseScript {
  setup(threads, queueUUID, serverName) {
    this.log(`Spawned with ${threads} max threads`);
    this.queue = Queue.getInstance(queueUUID);

    this.maxThreads = threads - 1;
    this.allocatedThreads = 0;
    this.workerThreads = new Set();
    this.serverName = serverName;
  }

  canAllocate(threads) {
    return this.allocatedThreads + threads <= this.maxThreads;
  }

  addWorkerThread(promise, threads) {
    if (!this.canAllocate(threads)) {
      throw new Error(
        `Overallocated threads: ${threads} max: ${this.maxThreads}, currently allocated: ${this.allocatedThreads}`
      );
    }

    this.allocatedThreads += threads;
    this.workerThreads.add(
      TrackablePromise.wrap(
        promise.finally(() => (this.allocatedThreads -= threads))
      )
    );
  }

  cleanup() {
    this.workerThreads.forEach(thread => {
      if (thread.isFinished) this.workerThreads.delete(thread);
    });
  }

  get availableThreads() {
    return this.maxThreads - this.allocatedThreads;
  }

  workPromise() {
    if (!this.workPromise || this.workPromise.isFinished)
      this.makeNewWorkPromise();
    return this.workPromise;
  }

  receiveRequest(req) {
    this.workPromise.resolve();
    this.makeNewWorkPromise();
    this.cleanup();

    let shutdown = this.handle(req);
    if (shutdown) this.shutdown = true;
  }

  makeNewWorkPromise() {
    if (this.workPromise) {
      this.workerThreads.delete(this.workPromise);
    }

    let promise = TrackablePromise.new();

    this.workPromise = promise;
    this.workerThreads.add(promise);
    return promise;
  }

  async perform() {
    let threads = this.pullFirstArg();
    let queueUUID = this.pullFirstArg();
    if (!_.isNumber(threads) || threads <= 0) {
      throw new Error("First argument to hackd must be positive thread count");
    }

    let serverName = this.pullFirstArg();

    this.setup(threads, queueUUID, serverName);
    if (!this.queue) {
      this.tlog(`No Queue found for hackd.js!`);
      return;
    }

    this.queue.registerWorker(this);
    await this.eventLoop();
  }

  async eventLoop() {
    this.makeNewWorkPromise();

    while (true) {
      let result = await Promise.race(Array.from(this.workerThreads));
      this.cleanup();
    }
  }

  handle(req) {
    let threads = req.threads;
    let action;
    if (req.type === Request.SHUTDOWN) {
      req.resolve();
      this.exit();
      return true;
    }

    if (!this.canAllocate(threads))
      throw new Error(
        `Cannot allocate ${threads}, max: ${this.maxThreads}, allocated: ${this.allocatedThreads}`
      );

    if (req.type === Request.HACK) {
      action = this.ns.hack(req.target, {threads: req.threads});
    } else if (req.type === Request.GROW) {
      action = this.ns.grow(req.target, {threads: req.threads, stock: true});
    } else if (req.type === Request.WEAKEN) {
      action = this.ns.weaken(req.target, {threads: req.threads});
    } else {
      console.warn(`Bad request: ${req.type.toString()}`);
      let err = new Error(`Unknown request type: ${req.type.toString()}`);
      req.reject(err);
      throw err;
    }

    action = action.finally(() => {
      req.resolve();
    });

    this.addWorkerThread(action, threads);
  }
}

export let main = ThisScript.runner();
