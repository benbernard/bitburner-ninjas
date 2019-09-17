let NS;
export async function main(ns) {
  NS = ns;
  NS.tprint("test hello bar");
  await NS.sleep(1);
}
