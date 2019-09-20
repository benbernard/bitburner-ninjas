import * as TK from "./tk.js";

class ThisScript extends TK.ServerScript {
  async perform() {
    let files = this.ns.ls("home");
    files = files.filter(file => file.endsWith(".js"));

    await this.ns.scp(files, "home", this.serverName);
  }
}

export let main = ThisScript.runner();
