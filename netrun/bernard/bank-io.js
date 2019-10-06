import * as TK from "./tk.js";
import {BankMessaging} from "./messaging.js";

class ThisScript extends TK.Script {
  async perform() {
    let messaging = new BankMessaging(this.ns);

    let response = await messaging.walletInfo(this.args[0]);
    this.tlog(`response: ${JSON.stringify(response)}`);
  }
}

export let main = ThisScript.runner();
