import {uuid, json} from "./utils.js";

export class Queue {
  constructor() {
    this.UUID = uuid();
    this.workers = new Set();
  }

  workerCount() {
    return this.workers.size;
  }

  shutdown() {
    if (this.isShutdown()) return;

    this._shutdown = true;
    this.workers.forEach(w => {
      w.receiveRequest(new Request(Request.SHUTDOWN));
      this.workers.delete(w);
    });
  }

  isShutdown() {
    return this._shutdown;
  }

  get availableThreads() {
    return Array.from(this.workers).reduce(
      (sum, e) => sum + e.availableThreads,
      0
    );
  }

  get maxThreads() {
    return Array.from(this.workers).reduce((sum, e) => sum + e.maxThreads, 0);
  }

  sendRequest(type, target, threads, cb) {
    if (this.availableThreads < threads) {
      throw new Error(
        `Bad request, not enough threads, wanted: ${threads} available: ${this.availableThreads}`
      );
    }

    let promises = [];
    let serverAllocs = new Map();
    for (let worker of this.sortedWorkers()) {
      let workerThreads = Math.min(threads, worker.availableThreads);

      let req = new Request(type, target, workerThreads);
      promises.push(req.donePromise);

      worker.receiveRequest(req);
      serverAllocs.set(worker.serverName, workerThreads);
      threads -= workerThreads;
      if (threads === 0) break;
    }

    Promise.all(promises).then(() => cb());
    return serverAllocs;
  }

  sortedWorkers() {
    return Array.from(this.workers).sort((a, b) => {
      return b.availableThreads - a.availableThreads;
    });
  }

  reclaimWorker(worker) {
    this.workers.remove(worker);
  }

  registerWorker(worker) {
    this.workers.add(worker);
  }

  static getInstance(uuid) {
    if (!navigator.workerQueue) {
      throw new Error("No Queue found");
    }

    let workerQueue = navigator.workerQueue;

    if (workerQueue.UUID !== uuid) {
      console.error("Queue UUID mismatch: ${workerQueue.UUID} vs. ${uuid}");
      return;
    }

    return workerQueue;
  }

  static createInstance() {
    let inst = new Queue();

    if (navigator.workerQueue) {
      navigator.workerQueue.shutdown();
    }

    navigator.workerQueue = inst;
    return inst;
  }
}

const noop = () => {};
export class Request {
  constructor(type, target, threads) {
    this.type = type;
    this.target = target;
    this.threads = threads;

    this.donePromise = new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });

    if (!Request.TYPES.has(type)) {
      throw new Error(`Bad type: ${type.toString()}`);
    }

    if (!Request.NEEDS_THREADS.has(type)) return;

    if (!_.isNumber(threads) || threads <= 0) {
      throw new Error(`Threads must be positive, got: ${threads}`);
    }
  }
}

Request.prototype.isRequest = true;

Request.NEEDS_THREADS = new Set([Request.HACK, Request.GROW, Request.WEAKEN]);

Request.HACK = "hack";
Request.GROW = "grow";
Request.WEAKEN = "weaken";
Request.SHUTDOWN = "shutdown";
Request.TYPES = new Set([
  Request.HACK,
  Request.GROW,
  Request.WEAKEN,
  Request.SHUTDOWN,
]);

export class TrackablePromise {
  constructor(promise) {
    this.rejected = false;
    this.resolved = false;

    this.promise = promise.then(
      data => {
        this.resolved = true;
        this.data = data;
        return data;
      },
      err => {
        this.rejected = true;
        this.error = err;
      }
    );
  }

  get isFinished() {
    return this.rejected || this.resolved;
  }

  then(...args) {
    return this.promise.then(...args);
  }

  catch(...args) {
    return this.promise.catch(...args);
  }

  finally(...args) {
    return this.promise.finally(...args);
  }

  static wrap(promise) {
    return new TrackablePromise(promise);
  }

  static new() {
    let resolve, reject;
    let trackable = new TrackablePromise(
      new Promise((res, rej) => {
        resolve = res;
        reject = rej;
      })
    );

    trackable.resolve = resolve;
    trackable.reject = reject;
    return trackable;
  }
}
