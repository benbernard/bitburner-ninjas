import BaseScript from "./baseScript.js";
import {_, json} from "./utils.js";
import {Queue, TrackablePromise, Request} from "./workerQueue.js";

export let masterQueue = new Queue();

class ThisScript extends BaseScript {
  setup(threads, queueUUID, serverName) {
    this.log(`Spawned with ${threads} max threads`);
    this.queue = Queue.getInstance(queueUUID);

    this.maxThreads = threads;
    this.allocatedThreads = 0;
    this.workerThreads = new Set();
    this.serverName = serverName;
  }

  addWorkerThread(promise, threads) {
    if (threads + this.allocatedThreads > this.maxThreads) {
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
    this.workPromise.resolve(req);
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
    this.queue.registerWorker(this);
    await this.eventLoop();
  }

  async eventLoop() {
    this.makeNewWorkPromise();

    while (true) {
      let result = await Promise.race(Array.from(this.workerThreads));
      if (result && typeof result === "object" && result.isRequest) {
        let shutdown = this.handle(result);
        if (shutdown) break;

        this.makeNewWorkPromise();
      }
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
    } else if (req.type === Request.HACK) {
      action = this.ns.hack(req.target, {threads: req.threads});
    } else if (req.type === Request.GROW) {
      action = this.ns.grow(req.target, {threads: req.threads});
    } else if (req.type === Request.WEAKEN) {
      action = this.ns.weaken(req.target, {threads: req.threads});
    } else {
      console.warn(`Bad request: ${req.type.toString()}`);
      let err = new Error(`Unknown request type: ${req.type.toString()}`);
      req.reject(err);
      throw err;
    }

    this.log(
      `Starting ${req.type}, threads: ${req.threads} against ${req.target}`
    );
    action = action.finally(() => {
      this.log(
        `Finished ${req.type}, threads: ${req.threads} against ${req.target}`
      );
      req.resolve();
    });

    this.addWorkerThread(action, threads);
  }
}

export let main = ThisScript.runner();
