import * as TK from "./tk.js";

class ThisScript extends TK.ServerScript {
  async perform() {
    let root = this.s.hasRoot() ? "YES" : "NO";
    this.tlog(
      `  Server: ${
        this.serverName
      } Hack: ${this.s.hackingLevel()} Root: ${root}`
    );

    let minSec = this.s.minSecurity();
    let baseSec = this.s.baseSecurity();
    let curSec = this.ns.nFormat(this.s.security(), "0.[00]");
    this.tlog(
      `    Security – Min: ${minSec} Max: ${baseSec} Current: ${curSec}`
    );

    let curMoney = this.cFormat(this.s.money(), "$0.00a");
    let maxMoney = this.cFormat(this.s.maxMoney(), "$0.00a");
    this.tlog(`    Money – Current: ${curMoney} Max: ${maxMoney}`);
  }
}

export let main = ThisScript.runner();
