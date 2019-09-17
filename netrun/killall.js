let NS;
export async function main(ns) {
  NS = ns;

  let server = NS.args.shift() || NS.getHostname();
  NS.killall(server);
}
