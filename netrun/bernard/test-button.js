import * as TK from "./tk.js";
import {addOptionButton} from "./utils.js";

class ThisScript extends TK.Script {
  async perform() {
    this.finally = addOptionButton("hello ben", () => {
      this.tlog("inside");
    });

    await this.sleep(5000);
  }
}

export let main = ThisScript.runner();
