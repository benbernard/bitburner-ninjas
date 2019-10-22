import BaseScript from "./baseScript.js";

class ThisScript extends BaseScript {
  async perform() {
    this.tlog(this.reserveHashes());
    while (true) {
      while (this.ns.hacknet.numHashes() > this.reserveHashes()) {
        this.ns.hacknet.spendHashes("Sell for Money");
        // this.ns.hacknet.spendHashes("Increase Maximum Money", "max-hardware");
      }
      await this.sleep(1000);
    }
  }

  reserveHashes() {
    return 0.9 * this.totalCache();
  }

  totalCache() {
    let count = this.ns.hacknet.numNodes();
    let cache = 0;
    for (let i = 0; i < count; i++) {
      cache += this.ns.hacknet.getNodeStats(i).hashCapacity;
    }

    return cache;
  }
}

export let main = ThisScript.runner();
