import * as TK from "./tk.js";
import {Gang, TASKS} from "./gangs.js";

class ThisScript extends TK.Script {
  async perform() {
    this.gang = new Gang(this.ns);
    while (true) {
      this.log(`Starting Gang management loop`);
      if (this.gang.canRecruit()) {
        this.log(`Recruiting new members`);
        let member = this.gang.recruit();
        member.setTask(TASKS.TRAIN_COMBAT);
      }

      await this.sleep(60000);
    }
  }
}

export let main = ThisScript.runner();
