export function purchasedSet(ns) {
  let set = {};
  let purchased = ns.getPurchasedServers();
  purchased.forEach(name => (set[name] = 1));
  return set;
}
