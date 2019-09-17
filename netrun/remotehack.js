let NS;

export async function main(ns) {
  NS = ns;

  let server = NS.args.shift();
  if (!server) {
    NS.tprint("No server specified!");
    NS.exit(1);
  }

  let command = NS.args.shift() || "hack";
  await setup(server, command);
  await compute(server, command);
}

async function setup(server, command) {
  let script = scriptForCommand(command);
  await NS.scp(script, server);
  await NS.kill(script, server);
}

async function compute(server, command) {
  let [total, used] = NS.getServerRam(server);
  let available = total - used;

  let script = scriptForCommand(command);
  let commandRam = NS.getScriptRam(script);

  let threads = Math.floor(available / commandRam);

  NS.tprint(`Running ${script} with ${threads}`);
  await NS.exec(script, server, threads);
}

function scriptForCommand(command) {
  return `${command}.js`;
}
