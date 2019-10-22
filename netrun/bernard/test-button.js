import * as TK from "./tk.js";
import {BaseScript} from "./baseScript.js";

class ThisScript extends TK.Script {
  async perform() {
    // console.log("BENBEN", BaseScript.prototype.addOptionButton.toString());

    // this.addOptionButton("hello ben", () => {
    //   this.tlog("Inside button");
    // });

    await this.sleep(5000);
  }
}

export let main = ThisScript.runner();
