import * as TK from "./tk.js";
import {Gang, TASKS} from "./gangs.js";

const map = {
  train: TASKS.TRAIN_COMBAT,
  war: TASKS.TERRITORY_WARFARE,
  wanted: TASKS.VIGILANTE_JUSTICE,
  vigilante: TASKS.VIGILANTE_JUSTICE,
  mug: TASKS.MUG,
};

class ThisScript extends TK.Script {
  async perform() {
    this.gang = new Gang(this.ns);

    // this.tlog(this.ns.gang.getTaskNames());

    let task = map[this.args[0]];
    if (!task) {
      this.tlog(`Gang Info:`);
      this.gang.members().forEach(m => this.tlog(`  ${m.logInfo()}`));

      // this.tlog(JSON.stringify(this.gang.members()[0].info, null, 2));
      return;
    }

    this.tlog(`Switching all gang members to ${task}`);
    this.gang.trainedMembers().forEach(m => m.setTask(task));
  }
}
export let main = ThisScript.runner();
