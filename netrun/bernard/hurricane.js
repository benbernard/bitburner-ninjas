import * as TK from "./tk.js";

let HACKD_SCRIPT = "hackd.js";

class ThisScript extends TK.Script {
  async perform() {
    let servers = await this.home.reachableServers({}, true);

    servers = servers.filter(s => s.availableRam() >= 2);

    let threadsToRun = 1000;

    let threadRam = this.home.scriptRam("hackd.js");
    let procs = [];
    for (let server of servers) {
      let scriptRuns = Math.floor(
        server.availableRam() / (threadRam * threadsToRun)
      );
      for (let i = 0; i < scriptRuns; i++) {
        let proc = new TK.Process(this.ns, {
          scriptRam: threadRam,
          threads: threadsToRun,
          script: HACKD_SCRIPT,
          server,
        });

        // proc.run();
        procs.push(proc);
      }
    }

    let count = 0;
    for (let proc of procs) {
      count++;
      // if (count > 10000) break;
      proc.run();
    }

    this.tlog(`Created ${procs.length} processes`);
    await this.sleep(100000);
  }
}

export let main = ThisScript.runner();
