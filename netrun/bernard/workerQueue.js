import {uuid} from "./utils.js";

export class SharedMem {
  constructor() {
    this.UUID = uuid();
  }

  shutdown() {
    this.shutdown = true;
  }

  isShutdown() {
    return this.shutdown;
  }

  static getInstance(uuid) {}

  static createInstance() {
    let inst = new SharedMem();

    if (document.sharedMem) {
      document.sharedMem.shutdown();
    }

    document.sharedMem = inst;
  }
}
