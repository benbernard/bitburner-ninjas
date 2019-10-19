import BaseScript from "./baseScript.js";
import {json} from "./utils.js";
import {DataManager} from "./communication.js";

class ThisScript extends BaseScript {
  async perform() {
    let manager = DataManager.initManager("send", "receive");

    await this.sleep(1000);
    manager.update("send", data => {
      data.push("foo");
    });

    this.unsub = manager.subscribe("receive", data => {
      this.tlog(`Subscribed: ` + data.pop());
      this.unsub();
      this.tlog("Hacking");
      this.ns.hack("foodnstuff").then(() => {
        this.tlog("done with Hacking");
        this.done();
      });
    });

    return new Promise((resolve, reject) => {
      this.done = resolve;
    });
  }
}

export let main = ThisScript.runner();
