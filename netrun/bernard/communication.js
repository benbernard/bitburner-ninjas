import {NSObject} from "./baseScript.js";

export class DataManager extends NSObject {
  constructor(ns, ...types) {
    super(ns);
    this.dataDumps = new Map();
    this.subscribers = new Map();

    types.forEach(t => this.addType(t));
  }

  addType(name, obj = []) {
    this.dataDumps.set(name, obj);
  }

  get(name) {
    return this.dataDumps.get(name);
  }

  has(name) {
    return this.dataDumps.has(name);
  }

  async update(name, fn) {
    let obj = this.get(name);
    console.log(JSON.stringify(obj));
    await fn(obj);
    this.notifySubscribers(name);
  }

  async notifySubscribers(name) {
    if (this.subscribers.has(name)) {
      let sub = this.getSubscriptions(name);
      let fnsLength = sub.fns.length;
      for (let i = 0; i < fnsLength; i++) {
        let realIndex = (i + sub.index) % fnsLength;

        let result = await sub.fns[realIndex].fn(this.get(name));

        if (result === DataManager.DONE) {
          sub.index = (realIndex + 1) % sub.fns.length;
          return;
        } else if (result === DataManager.REMOVE) {
          sub.fns[realIndex].remove();
          sub.index = sub.fns.length === 0 ? 0 : realIndex % sub.fns.length;
        } else if (result === DataManager.CONTINUE) {
          if (i === fnsLength - 1) {
            sub.overflow(this.get(name));
          }
          // do nothing
        } else {
          console.error(`Unknown result: ${JSON.stringify(result)}`);
        }
      }
    }
  }

  getSubscriptions(name) {
    if (!this.subscribers.has(name))
      this.subscribers.set(name, {index: 0, fns: []});
    return this.subscribers.get(name);
  }

  subscribe(name, fn) {
    let subscription = this.getSubscriptions(name);
    let remove = () => {
      subscription.fns = subscription.fns.filter(e => fn !== e);
    };
    subscription.fns.push({fn, remove});
    return remove;
  }

  static initManager(...args) {
    let instance = new this(...args);
    document.dataManager = instance;

    let promises = this.promises;
    this.promises = [];

    for (let promise of this.promises) {
      promise.resolve(instance);
    }

    return instance;
  }

  static async getInstance() {
    if (document.dataManager) return document.dataManager;

    return new Promise((resolve, reject) => {
      this.promises.push({resolve});
    });
  }
}

DataManager.DONE = Symbol("done");
DataManager.CONTINUE = Symbol("continue");
DataManager.REMOVE = Symbol("remove");
