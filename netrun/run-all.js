let NS;
export async function main(ns) {
  NS = ns;

  let command = NS.args.shift() || "hack";

  for (let server of SERVERS) {
    if (command === "hack") {
      if (!NS.scriptRunning("hack.js", server)) {
        NS.tprint(`Adding ${server} to hacking`);
        await NS.run("remotehack.js", 1, server);
        await NS.sleep(10);
      }
      continue;
    }

    if (command === "overwrite") {
      NS.tprint(`Running command ${command} on ${server}`);
      await NS.kill("hack.js", server);
      await NS.run("remotehack.js", 1, server);
      await NS.sleep(10);
    } else if (command === "kill") {
      NS.tprint(`Running command ${command} on ${server}`);
      await NS.kill("hack.js", server);
    } else if (command === "info") {
      NS.tprint(
        `  Server: ${server} Hack: ${NS.getServerRequiredHackingLevel(server)}`
      );

      let minSec = NS.getServerMinSecurityLevel(server);
      let baseSec = NS.getServerBaseSecurityLevel(server);
      let curSec = NS.nFormat(NS.getServerSecurityLevel(server), "0.[00]");
      NS.tprint(
        `    Security – Min: ${minSec} Max: ${baseSec} Current: ${curSec}`
      );

      let curMoney = NS.nFormat(NS.getServerMoneyAvailable(server), "$0.00a");
      let maxMoney = NS.nFormat(NS.getServerMaxMoney(server), "$0.00a");
      NS.tprint(`    Money – Current: ${curMoney} Max: ${maxMoney}`);
    } else {
      NS.tprint(`Unrecognized command: ${command}`);
      NS.exit(1);
    }
  }
}

const SERVERS = [
  "joesguns",
  "hong-fang-tea",
  "harakiri-sushi",
  "sigma-cosmetics",
  "foodnstuff",
  "zer0",
  "max-hardware",
  "nectar-net",
  "neo-net",
  "iron-gym",
  "phantasy",
  "silver-helix",
  "omega-net",
];
