import BaseScript from "./baseScript.js";

class ThisScript extends BaseScript {
  async perform() {
    await this.sleep(100);
    this.tlog("Done sleeping");
  }

  hack() {
    hack();
  }
}

// ben
export let main = ThisScript.runner();

// keep the memory
async function hack() {
  await this.ns.hack("foodnstuff");
  await this.ns.grow("foodnstuff");
  await this.ns.weaken("foodnstuff");
}
