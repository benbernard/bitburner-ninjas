import * as TK from "./tk.js";
import {BankMessaging} from "./messaging.js";

class ThisScript extends TK.Script {
  async perform() {
    let messaging = new BankMessaging(this.ns);

    if (this.ns.args[0] === "clear") {
      messaging.requestHandle().clear();
      messaging.responseHandle().clear();
    }

    let response = await messaging.sendAndWait({type: "hello"});
    this.tlog(`response: ${JSON.stringify(response)}`);
  }
}

export let main = ThisScript.runner();
