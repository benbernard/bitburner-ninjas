import * as TK from "./tk.js";
import {json} from "./baseScript.js";

class ThisScript extends TK.Script {
  async perform() {
    let instance = this.getSharedMem(this.pullFirstArg());

    // instance.data.hello

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
