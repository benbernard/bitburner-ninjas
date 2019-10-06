import * as TK from "./tk.js";
import {Market} from "./stocks.js";

class ThisScript extends TK.Script {
  async perform() {
    await this.home.awaitRun("stock-status.js", 1);

    let market = new Market(this.ns);

    this.tlog(`Selling all!`);

    for (let position of market.heldPositions()) {
      this.tlog(`  Selling ${position.shares} of ${position.stock.symbol}`);
      position.sell();
    }
  }
}

export let main = ThisScript.runner();
