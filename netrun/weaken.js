let SERVER;
let NS;

export async function main(ns) {
  NS = ns;
  SERVER = NS.args.shift();

  await weaken();
}

async function weaken() {
  let currentSecurity = () => NS.getServerSecurityLevel(SERVER);
  // let targetSecurity = () => NS.getServerBaseSecurityLevel(SERVER);
  let targetSecurity = () =>
    (NS.getServerMinSecurityLevel(SERVER) +
      NS.getServerBaseSecurityLevel(SERVER)) /
    2;

  while (currentSecurity() > targetSecurity()) {
    NS.print("Weakening");
    await NS.weaken(SERVER);
  }
}
