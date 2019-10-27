import * as TK from "./tk.js";
import {json} from "./utils.js";

const HACKING_SCRIPTS = new Set([
  "hurricane.js",
  "clown-car.js",
  "hydra-hack.js",
  "sharknado.js",
  "firegale.js",
  "firestorm.js",
  "minimal-hack.js",
  "minimal-grow.js",
  "minimal-weaken.js",
  "looped-weaken.js",
  "hackd.js",
]);

class ThisScript extends TK.Script {
  async perform() {
    await this.killHacks();

    // // Due to spawing rules, things may not have spawned by the time we are here, so sleep
    // this.tlog(`Waiting 1s`);
    // await this.sleep(1000);
    // await this.killHacks();
    //
    // this.tlog(`Waiting 1s`);
    // await this.sleep(1000);
    // await this.killHacks();
    //
    // this.tlog("Done Killing");
  }

  async killHacks() {
    let servers = await this.home.reachableServers({}, false);

    this.tlog("Killing all hacks");

    this.kill(this.home);

    await this.sleep(100);

    for (let server of servers) {
      this.kill(server);
      await this.sleep(1);
    }
  }

  kill(server) {
    for (let {filename, args} of server.ps()) {
      if (HACKING_SCRIPTS.has(filename)) {
        this.tlog(`Killing ${filename} on ${server.name}`);
        server.kill(filename, ...args);
      }
    }
  }
}

export let main = ThisScript.runner();
