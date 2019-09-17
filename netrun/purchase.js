let NS;

export async function main(ns) {
  NS = ns;

  let ram = NS.args.shift();
  let name = NS.args.shift();
  if (!ram) {
    listCosts();
  } else {
    await purchse(ram, name);
  }
}

function listCosts() {
  for (let i = 1; i <= 20; i++) {
    let ram = Math.pow(2, i);
    let cost = NS.getPurchasedServerCost(ram);
    NS.tprint(` RAM ${ram} -- ${cFormat(cost)}`);
  }
}

function cFormat(money) {
  return NS.nFormat(money, "$0.0 a");
}

async function purchse(ram, name) {
  let cost = cFormat(NS.getPurchasedServerCost(ram));

  if (!ram || !name) {
    NS.tprint(`Must specify ram and name!`);
    NS.exit(1);
  }

  let buy = await NS.prompt(
    `Purchase ${name} server with ${ram} ram for ${cost}`
  );
  if (buy) {
    NS.tprint(`Buying ${name}`);
    let success = await NS.purchaseServer(name, ram);

    if (success) {
      NS.tprint("Successful!");
    } else {
      NS.tprint("Failed!");
    }
  }
}
