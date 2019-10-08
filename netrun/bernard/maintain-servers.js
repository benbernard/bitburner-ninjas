import * as TK from "./tk.js";
import {BankMessaging} from "./messaging.js";

const MAX_MONEY_FILE = "max-money-seen.txt";

let targetTiers = [128, 1024, 16384, 262144, 1048576];

class ThisScript extends TK.Script {
  async perform() {
    this.bank = new BankMessaging(this.ns);

    while (true) {
      let wallet = await this.bank.walletInfo("servers");
      if (wallet.amount < 0) {
        await this.sleep(60000);
        continue;
      }

      let usableMoney = wallet.amount;

      // Can we purchase any of the correct tier
      let tier = this.targetTier(usableMoney);

      this.log(`Selected Tier: ${tier}`);
      let singleCost = this.tierCost(tier);
      if (!tier) {
        // Nothing to do
        await this.sleep(60000); // 10 seconds
        continue;
      }

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

      if (serversBelowTier.length === 0 && spotsAvailable === 0) {
        this.log(`Servers are upgraded`);
        await this.sleep(10000);
        continue;
      }

      let deleteCount = Math.min(
        purchaseCount - spotsAvailable,
        serversBelowTier.length
      );

      if (deleteCount > 0) {
        let toDelete = serversBelowTier
          .sort((a, b) => this.ns.getServerRam(a) - this.ns.getServerRam(b))
          .slice(0, deleteCount);

        for (let name of toDelete) {
          this.removeServer(name);
        }
      }

      for (let i = 0; i < purchaseCount; i++) {
        this.tlog(`Buying server at ${tier}`);
        let response = await this.bank.buyServer("hydra", tier);
        if (!response.purchased) {
          this.tlog(`Unknown problem buying server at ${tier}!`);
          break;
        } else {
          this.log(`Successfully purchased!`);
        }
      }

      await this.sleep(1000);
    }
  }

  buyableTiers() {
    let purchasedServers = this.ns
      .getPurchasedServers()
      .map(name => new TK.Server(this.ns, name));

    let minPurchased = Math.min(...purchasedServers.map(s => s.ram()));
    if (!minPurchased) minPurchased = 0;
    return targetTiers.filter(r => r >= minPurchased);
  }

  removeServer(name) {
    this.log(`Deleting ${name}`);
    this.ns.killall(name);
    this.ns.deleteServer(name);
  }

  usableMoney(maxMoney) {
    return Math.max(this.home.money() - 0.5 * maxMoney, 0);
  }

  tierCost(tier) {
    return this.ns.getPurchasedServerCost(tier);
  }

  targetTier(money) {
    let chosenTier = null;
    let tiers = this.buyableTiers();
    this.log(`Buyable Tiers: ${JSON.stringify(tiers)}`);
    for (let tier of tiers) {
      let cost = this.tierCost(tier);
      if (cost < money) chosenTier = tier;
    }

    return chosenTier;
  }
}

export let main = ThisScript.runner();
