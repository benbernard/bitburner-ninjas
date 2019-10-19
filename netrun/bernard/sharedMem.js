import {uuid, getDocument} from "./utils.js";
import {BaseScript} from "./baseScript.js";

let doc = getDocument();

export class SharedMem {
  constructor() {
    this.UUID = uuid();
    this.data = {};
  }

  shutdown() {
    this.shutdown = true;
    doc.sharedMem.delete(this.UUID);
  }

  isShutdown() {
    return this.shutdown;
  }

  static getInstance(uuid) {
    if (!doc.sharedMem || !doc.sharedMem.has(uuid))
      throw new Error("No sharedMem for: ${uuid}");
    return doc.sharedMem.get(uuid);
  }

  static createInstance() {
    let inst = new SharedMem();

    if (!doc.sharedMem) doc.sharedMem = new Map();
    doc.sharedMem.set(inst.UUID, inst);

    return inst;
  }
}

BaseScript.prototype.createSharedMem = function () {
  let inst = SharedMem.createInstance();
  this.addFinally(() => inst.shutdown());
};

BaseScript.prototype.getSharedMem = function (uuid) {
  return SharedMem.getInstance(uuid);
};
