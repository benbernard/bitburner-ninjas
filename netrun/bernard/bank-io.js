import * as TK from "./tk.js";
import {BankMessaging} from "./messaging.js";
import {convertStrToMoney} from "./utils.js";

class ThisScript extends TK.Script {
  async perform() {
    let bank = new BankMessaging(this.ns);

    let action = this.pullFirstArg();

    if (action === "info") {
      let response = await bank.walletInfo(this.args[0]);
      this.tlog(
        `Wallet: ${response.name}, portion: ${
          response.portion
        }, amount: ${this.cFormat(response.amount)}`
      );
    } else if (action === "deposit") {
      let wallet = this.args[0];
      let amount = convertStrToMoney(this.args[1]);

      this.tlog(`Depositing Amount: ${this.cFormat(amount)} to: ${wallet}`);
      let response = await bank.deposit(wallet, amount);
      this.tlog(`Deposit Response: ${JSON.stringify(response)}`);
    }
  }
}

export let main = ThisScript.runner();
