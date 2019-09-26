import * as TK from "./tk.js";

class ThisScript extends TK.Script {
  async perform() {
    let [server, matcher] = this.args;

    if (!matcher) {
      matcher = server;
      server = this.currentServer().name;
    }

    this.s = this.server(server);

    let processes = this.s.ps();
    let process = processes.find(info =>
      this.infoStr(info).startsWith(matcher)
    );

    if (!process)
      process = processes.find(
        info => this.infoStr(info).indexOf(matcher) !== -1
      );

    if (!process) {
      await this.exit(`No process found matching ${matcher}`);
    }

    await this.s.tail(process.filename, ...process.args);
  }

  infoStr(info) {
    return `${info.filename} ${info.args.join(" ")}`;
  }
}

export let main = ThisScript.runner();
