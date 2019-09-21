import * as TK from "./tk.js";

class ThisScript extends TK.ServerScript {
  async perform() {
    let command = this.pullFirstArg();
    if (!command) return this.exit(`No command specified`);

    let script = TK.scriptForCommand(command);

    await this.s.setupScript(script);
    await this.s.exec(script, 1, ...this.args);
  }
}

export let main = ThisScript.runner();
