let NS;
export async function main(ns) {
  NS = ns;

  NS.tprint(await NS.scan(NS.args.shift()));
}
