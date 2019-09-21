import * as TK from "./tk.js";

class ThisScript extends TK.ServerScript {
  async perform() {
    let processes = this.s.ps();

    if (processes.length === 0) {
      await this.exit(`No processes on ${this.s.name}!`);
    }

    for (let info of processes) {
      this.tlog(`Killl ${info.filename} on ${this.s.name}`);
    }

    await this.s.killall();
  }
}

export let main = ThisScript.runner();
