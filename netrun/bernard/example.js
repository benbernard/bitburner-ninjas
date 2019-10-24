export async function main(ns) {
  let p1 = ns.grow("foodnstuff", {threads: 1});
  let p2 = ns.hack("foodnstuff", {threads: 1});

  await p1;
  await p2;

  ns.tprint("Done");
}
