import * as TK from "./tk.js";
import {EquipmentSet, Gang, TASKS} from "./gangs.js";
import {BankMessaging} from "./messaging.js";

let EXCLUDED_NAMES = ["Member-nph4w2vrs4afberagod6t"];

class ThisScript extends TK.Script {
  async perform() {
    this.disableLogging("sleep");
    this.gang = new Gang(this.ns);
    this.bank = new BankMessaging(this.ns);

    while (true) {
      this.es = new EquipmentSet(this.ns);

      await this.recruitNewMembers();
      await this.buyEquipment();
      await this.ascendMembers();
      // await this.setTasks();

      await this.sleep(5000);
    }
  }

  async setTasks() {
    for (let member of this.gang.members()) {
      if (member.trained()) {
        if (member.task === TASKS.TRAIN_COMBAT) {
          member.setTask(TASKS.TERRITORY_WARFARE);
          this.tlog(`Finished Training Gang Member ${member.name}`);
        }
      } else if (member.task !== TASKS.TRAIN_COMBAT) {
        member.setTask(TASKS.TRAIN_COMBAT);
        this.tlog(`Setting ${member.name} to training`);
      }
    }
  }

  async recruitNewMembers() {
    this.log(`Starting Gang management loop`);
    while (this.gang.canRecruit()) {
      this.log(`Recruiting new members`);
      let member = this.gang.recruit();
      member.setTask(TASKS.TRAIN_COMBAT);
    }
  }

  async ascendMembers() {
    let wallet = await this.bank.walletInfo("gang");
    let amount = wallet.amount;

    // Can I ascend
    let ascensionCost = this.es
      .normalEquipment({includeAugments: false})
      .reduce((sum, e) => sum + e.cost, 0);

    this.log(`Ascension cost: ${ascensionCost}`);

    if (ascensionCost > amount) return;

    let members = this.gang.members();

    for (let member of members) {
      if (!this.fullyOwnsEquipment(member)) continue;
      if (EXCLUDED_NAMES.indexOf(member.name) !== -1) continue;

      // let ascensionsNeeded = member.ascensionsNeeded();
      // if (ascensionsNeeded * ascensionCost >= amount) continue;

      let count = 0;
      while (!member.fullyAscended()) {
        count++;
        if (count > 10) {
          count = 0;
          await this.sleep(100);
        }

        if (ascensionCost < amount) {
          this.tlog(`Ascending ${member.name}`);
          member.ascend();
          let cost = await this.buyEquipmentForMember(member, amount);
          amount -= cost;
          member.setTask(TASKS.TRAIN_COMBAT);
        } else {
          break;
        }
      }
    }

    await this.bank.withdraw("gang", wallet.amount - amount);
  }

  fullyOwnsEquipment(member) {
    return (
      member.unownedNormalEquipment(this.es, {includeAugments: false})
        .length === 0
    );
  }

  async buyEquipment() {
    let members = this.gang.members();

    let wallet = await this.bank.walletInfo("gang");
    let availableAmount = wallet.amount;
    if (availableAmount < 0) return;

    for (let member of members) {
      let cost = await this.buyEquipmentForMember(member, availableAmount);
      availableAmount -= cost;
    }

    await this.bank.withdraw("gang", wallet.amount - availableAmount);
  }

  async buyEquipmentForMember(member, availableAmount) {
    let unownedEquipment = member.unownedNormalEquipment(this.es, {
      includeAugments: false,
    });
    let cost = 0;
    for (let equipment of unownedEquipment) {
      if (equipment.cost < availableAmount) {
        this.log(
          `Buying ${equipment.name} cost: ${equipment.cost} for: ${member.name}`
        );
        availableAmount -= equipment.cost;
        cost += equipment.cost;
        this.ns.gang.purchaseEquipment(member.name, equipment.name);
      }
    }

    return cost;
  }
}

export let main = ThisScript.runner();
