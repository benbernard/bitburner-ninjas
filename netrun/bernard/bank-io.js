import {BaseScript, NSObject} from "./baseScript.js";
import {BankMessaging} from "./messaging.js";
import {convertStrToMoney} from "./utils.js";

class ThisScript extends BaseScript {
  async perform() {
    let bank = new BankMessaging(this.ns);
    this.bank = bank;

    let action = this.pullFirstArg();

    if (action === "info") {
      let response = await bank.walletInfo(this.args[0]);
      this.tlog(this.formatWallet(response));
    } else if (action === "deposit") {
      let wallet = this.args[0];
      let amount = convertStrToMoney(this.args[1]);

      this.tlog(`Depositing Amount: ${this.cFormat(amount)} to: ${wallet}`);
      let response = await bank.deposit(wallet, amount);
      this.tlog(`Deposit Response: ${JSON.stringify(response)}`);
    } else if (action === "set") {
      let sets = [];
      for (let arg of this.args) {
        let [name, amount] = arg.split("=");
        sets.push([name, convertStrToMoney(amount)]);
      }
      let response = await bank.setBalances(sets);
      this.tlog(`Set Balance Response: ${JSON.stringify(response)}`);
      await this.printAllWallets();
    } else if (action === "all" || action === "infos") {
      await this.printAllWallets();
    } else if (action === "clear" || action === "infos") {
      let response = await bank.clear();
      this.tlog(`Clear response: ${JSON.stringify(response)}`);
      await this.printAllWallets();
    } else if (action === "withdraw") {
      let response = await this.bank.withdraw(
        this.args[0],
        convertStrToMoney(this.args[1])
      );
      this.tlog(`Withdraw response: ${JSON.stringify(response)}`);
      await this.printAllWallets();
    } else {
      this.tlog(`Unkown bank request: ${action}`);
    }
  }

  async printAllWallets() {
    let wallets = (await this.bank.allWallets()).wallets;
    wallets.forEach(wallet => {
      this.tlog(this.formatWallet(wallet));
    });
  }

  formatWallet(wallet) {
    return `Wallet: ${wallet.name}, portion: ${
      wallet.portion
    }, amount: ${this.cFormat(wallet.amount)}`;
  }
}

export let main = ThisScript.runner();
