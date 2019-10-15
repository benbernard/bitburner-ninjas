import * as TK from "./tk.js";

class ThisScript extends TK.Script {
  async perform() {
    let servers = await this.home.reachableServers();

    servers = servers.filter(s => s.maxMoney() > 0);

    this.tlog(`By Time:`);
    this.printServers(servers.sort(byMoneyPerTime));

    this.tlog("");
    this.tlog("");

    this.tlog(`By Ram:`);
    this.printServers(servers.sort(byMoneyPerRam));
  }

  printServers(servers) {
    for (let server of servers) {
      this.tlog(
        `Info: ${server.info()} money per time: ${this.cFormat(
          moneyPerTime(server)
        )} money per ram: ${this.cFormat(moneyPerRam(server))}`
      );
    }
  }
}

function byMoneyPerTime(a, b) {
  return moneyPerTime(b) - moneyPerTime(a);
}

function moneyPerTime(server) {
  let money = server.maxMoney() * 0.5;
  let time = server.hackTime() + server.growTime() + server.weakenTime();
  return money / time;
}

function byMoneyPerRam(a, b) {
  return moneyPerRam(b) - moneyPerRam(a);
}

function moneyPerRam(server) {
  let hackThreads = server.threadsForHackPercent(50);
  let growThreads = Math.ceil(server.threadsForGrowth(2));
  let weakenThreads = (hackThreads * 0.002 + growThreads * 0.004) / 0.05;

  let hackRam = server.scriptRam("minimal-hack.js");
  let growRam = server.scriptRam("minimal-grow.js");
  let weakenRam = server.scriptRam("minimal-weaken.js");

  let ram =
    hackRam * hackThreads + growThreads * growRam + weakenRam * weakenThreads;

  let money = server.maxMoney() * 0.5;

  return money / ram;
}

export let main = ThisScript.runner();
