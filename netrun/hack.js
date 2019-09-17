let NS;
let SERVER;
let STARTING_MONEY;

export async function main(ns) {
  NS = ns;
  let server = NS.args.shift() || NS.getHostname();
  SERVER = server;
  STARTING_MONEY = NS.getServerMoneyAvailable(SERVER);

  // NS.tprint(`Hacking server ${SERVER}`);
  while (true) {
    await weaken();
    await grow();

    await weaken();

    NS.print("Hacking");
    await NS.hack(SERVER);
  }
}

function targetMoney() {
  return NS.getServerMaxMoney(SERVER) * 0.9;
  // return STARTING_MONEY;
}

const serverMoney = () => NS.getServerMoneyAvailable(SERVER);

async function grow() {
  let money = NS.getServerMoneyAvailable(SERVER);

  while (serverMoney() < targetMoney()) {
    NS.print("Growing");
    await NS.grow(SERVER);
    await weaken();
  }
}

async function weaken() {
  let currentSecurity = () => NS.getServerSecurityLevel(SERVER);

  let targetSecurity = () => {
    let base = NS.getServerMinSecurityLevel(SERVER);
    let diff = NS.getServerBaseSecurityLevel(SERVER) - base;
    return base + diff * 0.2;
  };

  while (currentSecurity() > targetSecurity()) {
    NS.print("Weakening");
    await NS.weaken(SERVER);
  }
}
