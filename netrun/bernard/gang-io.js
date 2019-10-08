import * as TK from "./tk.js";
import {Gang, TASKS} from "./gangs.js";

const map = {
  train: TASKS.TRAIN_COMBAT,
  war: TASKS.TERRITORY_WARFARE,
  wanted: TASKS.VIGILANTE_JUSTICE,
  vigilante: TASKS.VIGILANTE_JUSTICE,
};

class ThisScript extends TK.Script {
  async perform() {
    this.gang = new Gang(this.ns);

    this.tlog(this.ns.gang.getTaskNames());

    let task = map[this.args[0]];
    if (!task) {
      this.tlog(`Gang Info:`);
      this.gang.members().forEach(m => this.tlog(`  ${m.name} - ${m.task}`));
      return;
    }

    let prompt = await this.ns.prompt(`Switch all gang members to ${task}?`);
    if (prompt) {
      this.gang.members().forEach(m => m.setTask(task));
    }
  }
}
export let main = ThisScript.runner();
