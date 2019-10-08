import * as TK from "./tk.js";
import {Gang, TASKS} from "./gangs.js";
import {BankMessaging} from "./messaging.js";

class ThisScript extends TK.Script {
  async perform() {
    this.gang = new Gang(this.ns);
    this.bank = new BankMessaging(this.ns);

    while (true) {
      this.log(`Starting Gang management loop`);
      if (this.gang.canRecruit()) {
        this.log(`Recruiting new members`);
        let member = this.gang.recruit();
        member.setTask(TASKS.TRAIN_COMBAT);
      }

      await this.buyEquipment();
      await this.sleep(5000);
    }
  }

  async buyEquipment() {
    let members = this.gang.members();

    let wallet = await this.bank.walletInfo("gang");
    let availableAmount = wallet.amount;
    if (availableAmount < 0) return;

    for (let member of members) {
      let unownedEquipment = member.unownedNormalEquipment();
      for (let equipment of unownedEquipment) {
        if (equipment.cost < availableAmount) {
          this.log(
            `Buying ${equipment.name} cost: ${equipment.cost} for: ${member.name}`
          );
          availableAmount -= equipment.cost;
          await this.bank.buyEquipment(member.name, equipment.name);
        }
      }
    }
  }
}

export let main = ThisScript.runner();
