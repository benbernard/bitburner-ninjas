import * as TK from "./tk.js";
import {Market} from "./stocks.js";
import {BankMessaging} from "./messaging.js";

class ThisScript extends TK.Script {
  async perform() {
    await this.home.awaitRun("stock-status.js", 1);

    let market = new Market(this.ns, new BankMessaging(this.ns));

    this.tlog(`Selling all!`);

    for (let position of market.heldPositions()) {
      this.tlog(`  Selling ${position.shares} of ${position.stock.symbol}`);
      await position.sell();
    }
  }
}

export let main = ThisScript.runner();
