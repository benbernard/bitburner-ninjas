import * as TK from "./tk.js";

const MAX_MONEY_FILE = "max-money-seen.txt";

let targetTiers = [128, 1024, 16384, 262144, 1048576];

class ThisScript extends TK.Script {
  async perform() {
    while (true) {
      let maxMoney = this.getMaxMoney();
      this.writeMaxMoney(maxMoney); // Update the file

      // Can we purchase any of the correct tier
      let tier = this.targetTier(maxMoney);
      this.log(`Selected Tier: ${tier}`);
      let singleCost = this.tierCost(tier);
      if (!tier || this.usableMoney(maxMoney) < singleCost) {
        // Nothing to do
        await this.sleep(10000); // 10 seconds
        continue;
      }

      let usableMoney = this.home.money() - 0.5;

      // How many to buy
      let purchaseCount = Math.min(
        Math.floor(usableMoney / singleCost),
        this.ns.getPurchasedServerLimit()
      );
      this.log(`Trying to purchase ${purchaseCount} servers of tier ${tier}`);

      let purchasedServers = this.ns.getPurchasedServers();
      let spotsAvailable =
        this.ns.getPurchasedServerLimit() - purchasedServers.length;

      let serversBelowTier = purchasedServers.filter(
        name => this.ns.getServerRam(name)[0] < tier
      );

      if (serversBelowTier.length === 0) {
        this.log(`Servers are upgraded`);
        await this.sleep(10000);
        continue;
      }

      let deleteCount = Math.min(
        purchaseCount - spotsAvailable,
        serversBelowTier.length
      );

      if (deleteCount > 1) {
        let toDelete = serversBelowTier
          .sort((a, b) => this.ns.getServerRam(a) - this.ns.getServerRam(b))
          .slice(0, deleteCount);

        for (let name of toDelete) {
          this.log(`Deleting ${name}`);
          this.ns.killall(name);
          this.ns.deleteServer(name);
        }
      }

      for (let i = 0; i < purchaseCount; i++) {
        this.log(`Buying server at ${tier}`);
        this.ns.purchaseServer("hydra", tier);
      }
    }
  }

  usableMoney(maxMoney) {
    return Math.max(this.home.money() - 0.5 * maxMoney, 0);
  }

  tierCost(tier) {
    return this.ns.getPurchasedServerCost(tier);
  }

  targetTier(maxMoney) {
    let chosenTier = null;
    for (let tier of targetTiers) {
      let cost = this.tierCost(tier);
      if (cost * 10 < maxMoney) chosenTier = tier;
    }

    return chosenTier;
  }

  getMaxMoney() {
    let fileMoney = 0;
    if (this.home.fileExists(MAX_MONEY_FILE)) {
      let contents = this.ns.read(MAX_MONEY_FILE);
      fileMoney = parseInt(contents);
    }

    return Math.max(fileMoney, this.home.money());
  }

  writeMaxMoney(money) {
    this.ns.write(MAX_MONEY_FILE, money.toString(), "w");
  }
}

export let main = ThisScript.runner();
