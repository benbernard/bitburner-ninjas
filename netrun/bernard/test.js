import * as TK from "./tk.js";
import {json} from "baseScript.js";
import {DataManager} from "./communication.js";
import {SharedMem} from "./sharedMem.js";

class ThisScript extends TK.Script {
  async perform() {
    this.shared = this.createSharedMem();

    this.shared.data.hello = "Ben";
    this.home.exec("test2.js", 1, this.shared.UUID);

    let lastValue;
    while (true) {
      let currentValue = this.shared.data.response;
      if (currentValue !== lastValue) {
        lastValue = currentValue;
        this.tlog(currentValue);
      }

      await this.sleep(100);
    }
  }
}

export let main = ThisScript.runner();
