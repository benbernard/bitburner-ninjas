import {BankMessaging} from "./messaging.js";
import {BaseScript} from "./baseScript.js";

const MAX_MONEY_FILE = "max-money-seen.txt";
const DYING_FILE = "dying.txt";

// let targetTiers = [128, 1024, 16384, 262144, 1048576];
let targetTiers = [128, 1024, 16384, 262144, 524288];

class ThisScript extends BaseScript {
  async perform() {
    this.bank = new BankMessaging(this.ns);

    // Wait for bank to startup
    await this.sleep(3000);

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
      if (!tier) {
        // Nothing to do
        await this.sleep(60000); // 10 seconds
        continue;
      }

      // How many to buy
      let singleCost = this.tierCost(tier);
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

      let purchaseNow = Math.min(spotsAvailable, purchaseCount);
      for (let i = 0; i < purchaseNow; i++) {
        this.tlog(`Buying server at ${tier}`);
        let response = await this.bank.buyServer("hydra", tier);
        if (!response.purchased) {
          this.tlog(`Unknown problem buying server at ${tier}!`);
          break;
        } else {
          this.log(`Successfully purchased!`);
        }
      }

      if (deleteCount > 0) {
        let toDelete = serversBelowTier
          .sort((a, b) => this.ns.getServerRam(a) - this.ns.getServerRam(b))
          .slice(0, deleteCount);

        this.setDying(toDelete);
        for (let name of toDelete) {
          await this.replaceServer(name, tier);
          purchaseCount--;
        }
      }

      await this.sleep(1000);
    }
  }

  setDying(servers) {
    this.ns.write(DYING_FILE, "not important", "w");
    for (let server of servers) {
      this.ns.scp([DYING_FILE], "home", server);
    }
    this.ns.rm(DYING_FILE, "home");
  }

  buyableTiers() {
    let purchasedServers = this.ns.getPurchasedServers();

    let minPurchased = Math.max(
      ...purchasedServers.map(s => this.ns.getServerRam(s)[0])
    );
    if (!minPurchased) minPurchased = 0;
    return targetTiers.filter(r => r >= minPurchased);
  }

  async replaceServer(name, tier) {
    this.log(`Deleting ${name}`);

    while (this.ns.ps(name).length > 0) {
      await this.sleep(1000);
    }

    this.tlog(`Repurchaseing ${name} at ${tier}`);
    this.ns.deleteServer(name);
    this.ns.purchaseServer(name, tier);
    await this.bank.withdraw("servers", this.tierCost(tier));
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
