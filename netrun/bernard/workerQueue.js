import {uuid, getDocument} from "./baseScript.js";

export class SharedMem {
  constructor() {
    this.UUID = uuid();
    this.workers = new Set();
  }

  shutdown() {
    this.shutdown = true;
  }

  isShutdown() {
    return this.shutdown;
  }

  availableThreads() {}

  registerWorker(threads) {
    let newWorker = new Worker(threads);
    this.workers.add(newWorker);
  }

  static getInstance(uuid) {
    let doc = getDocument();
    if (!doc.sharedMem) {
      throw new Error("No SharedMem found");
    }

    let sharedMem = doc.sharedMem;

    if (sharedMem.UUID !== uuid)
      throw new Error("SharedMem UUID mismatch: ${sharedMem.UUID} vs. ${uuid}");

    return sharedMem;
  }

  static createInstance() {
    let inst = new SharedMem();

    let doc = getDocument();
    if (doc.sharedMem) {
      doc.sharedMem.shutdown();
    }

    doc.sharedMem = inst;
  }
}

class Worker {
  constructor(threads) {
    this.UUID = uuid();
    this.threads = threads;

    this.promise = new Promise((resolve, reject) => {
      this.promiseInfo = {
        resolve,
        reject,
      };
    });
  }

  resolve(result) {
    this.promiseInfo.resolve(result);
  }

  reject(error) {
    this.promiseInfo.reject(error);
  }
}
