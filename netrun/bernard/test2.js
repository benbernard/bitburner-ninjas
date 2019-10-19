import * as TK from "./tk.js";
import {json} from "./utils.js";
import {DataManager} from "./communication.js";

class ThisScript extends TK.Script {
  async perform() {
    let instance = await DataManager.getInstance();

    instance.subscribe("send", data => {
      this.tlog(`Got: ${json(data)}`);
      instance.update("receive", data => data.push("bar"));
      this.done();
    });

    return new Promise((resolve, reject) => {
      this.done = resolve;
    });
  }
}

export let main = ThisScript.runner();
