import * as TK from "./tk.js";
import {EquipmentSet, Gang, TASKS, HACKING_GANG} from "./gangs.js";
import {BankMessaging} from "./messaging.js";

let EXCLUDED_NAMES = [
  "Member-0u548zz9e4cnnna3fhwzx78",
  "Member-7fyh015rsd7wcneapwwl2",
  "Member-t9mbib4wpl7e2lbruzzk5",
];
const FOCUSED_ASCEND = false;

class ThisScript extends TK.Script {
  async perform() {
    this.setTraining = new Set();
    this.setTasking = new Set();
    this.disableLogging("sleep");
    this.gang = new Gang(this.ns);
    this.bank = new BankMessaging(this.ns);

    while (true) {
      this.es = new EquipmentSet(this.ns);

      await this.recruitNewMembers();
      await this.buyEquipment();
      await this.ascendMembers();
      await this.setTasks();

      await this.sleep(5000);
    }
  }

  async setTasks() {
    for (let member of this.gang.members()) {
      if (member.trained()) {
        if (
          member.task === this.trainTask() &&
          !this.setTasking.has(member.name)
        ) {
          member.setTask(
            member.fullyAscended() ? this.terrorTask() : this.smallRespectTask()
          );
          this.tlog(`Finished Training Gang Member ${member.name}`);
          this.setTasking.add(member.name);
        }
      } else if (member.task !== this.trainTask()) {
        this.setToTraining(member);
      }
    }
  }

  setToTraining(member) {
    if (!this.setTraining.has(member.name)) {
      this.tlog(`Setting ${member.name} to training`);
      this.setTraining.add(member.name);
      member.setTask(this.trainTask());
    }
  }

  smallRespectTask() {
    if (HACKING_GANG) {
      return TASKS.RANSOM;
    } else {
      return TASKS.MUG;
    }
  }

  terrorTask() {
    if (HACKING_GANG) {
      return TASKS.CYBER_TERROR;
    } else {
      return TASKS.TERROR;
    }
  }

  async recruitNewMembers() {
    this.log(`Starting Gang management loop`);
    while (this.gang.canRecruit()) {
      this.log(`Recruiting new members`);
      let member = this.gang.recruit();
      member.setTask(this.trainTask());
    }
  }

  trainTask() {
    if (HACKING_GANG) return TASKS.TRAIN_HACK;
    return TASKS.TRAIN_COMBAT;
  }

  async ascendMembers() {
    let wallet = await this.bank.walletInfo("gang");
    let amount = wallet.amount;

    // Can I ascend
    let ascensionCost = this.es
      .normalEquipment({includeAugments: false})
      .reduce((sum, e) => sum + e.cost, 0);

    this.log(`Ascension cost: ${this.cFormat(ascensionCost)}`);
    let members = this.gang.members();

    this.log(
      `Cost for full ascension: ${this.cFormat(
        ascensionCost * members[0].ascensionsNeeded(true)
      )}`
    );

    if (ascensionCost > amount && !FOCUSED_ASCEND) return;

    let fullAscensionCostTold = false;

    if (FOCUSED_ASCEND) members = [members[2]];

    for (let member of members) {
      if (!this.fullyOwnsEquipment(member)) continue;
      if (EXCLUDED_NAMES.indexOf(member.name) !== -1) continue;
      if (member.fullyAscended() && !FOCUSED_ASCEND) continue;

      let ascensionsNeeded = member.ascensionsNeeded();
      if (!fullAscensionCostTold) {
        this.log(
          `Full ascension for ${member.name} costs: ${this.cFormat(
            ascensionsNeeded * ascensionCost
          )}`
        );
        fullAscensionCostTold = true;
      }

      if (!FOCUSED_ASCEND && ascensionsNeeded * ascensionCost >= amount)
        continue;

      let count = 0;
      for (let i = 0; i < ascensionsNeeded; i++) {
        if (i > 0 && i % 80000 === 0) {
          this.tlog(`Withdrawing money for ${member.name}`);
          await this.bank.withdraw("gang", wallet.amount - amount);
          await this.sleep(100);

          wallet = await this.bank.walletInfo("gang");
          amount = wallet.amount;
        }

        if (ascensionCost < amount) {
          if (i === 0) this.tlog(`Ascending ${member.name}`);
          count++;
          member.ascend();
          let cost = await this.buyEquipmentForMember(member, amount);
          amount -= cost;
        } else {
          break;
        }

        if (i > ascensionsNeeded - 1) {
          ascensionsNeeded += member.ascensionsNeeded();
        }
      }

      if (count > 0) {
        this.tlog(`Ascended ${member.name} ${count} times`);
        member.setTask(this.trainTask());
      }
      break;
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
        // this.log(
        //   `Buying ${equipment.name} cost: ${equipment.cost} for: ${member.name}`
        // );
        availableAmount -= equipment.cost;
        cost += equipment.cost;
        this.ns.gang.purchaseEquipment(member.name, equipment.name);
      }
    }

    if (member.greatlyAscended() && !member.hasAscendedAugments(this.es)) {
      let ascendedEquipment = this.es.ascendedEquipment();
      for (let equipment of member.unownedAscendedAugments(this.es)) {
        if (availableAmount > equipment.cost) {
          let result = this.ns.gang.purchaseEquipment(
            member.name,
            equipment.name
          );
          if (result) {
            availableAmount -= equipment.cost;
            cost += equipment.cost;
          }
        }
      }
    }

    return cost;
  }
}

export let main = ThisScript.runner();
