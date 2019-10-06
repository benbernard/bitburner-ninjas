import * as TK from "./tk.js";
import {Gang} from "./gangs.js";

class ThisScript extends TK.Script {
  async perform() {
    this.gang = new Gang(this.ns);

    this.tlog(this.ns.gang.getTaskNames());

    let members = this.gang.members().filter(m => !m.isWorking());

    if (members.length === 0) throw new Error(`No Unassigned gang member`);
    let m = members[0];

    m.setTask("Train Combat");

    // this.tlog(`Members:`);
    // this.gang.members().forEach(m => this.tlog(`  ${m.name} - ${m.task}`));
  }
}

export let main = ThisScript.runner();
