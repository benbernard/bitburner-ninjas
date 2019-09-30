import * as TK from "./tk.js";
import {Market} from "./stocks.js";

class ThisScript extends TK.Script {
  async perform() {
    let market = new Market(this.ns);

    let totalCost = 0;
    let totalGain = 0;

    this.tlog(`Stocks Held`);
    for (let position of market.heldPositions()) {
      let gain = Math.floor(position.gain());
      let cost = Math.floor(position.cost());

      totalCost += cost;
      totalGain += gain;

      let percentageGain = Math.floor((gain / cost) * 10000) / 100;

      this.tlog(
        `  ${position.stock.symbol} - Shares: ${this.nFormat(
          position.shares
        )} Cost: ${this.cFormat(cost)} Gain: ${this.cFormat(
          gain
        )} Percentage: ${percentageGain}%`
      );
    }

    let percentageGain = Math.floor((totalGain / totalCost) * 10000) / 100;
    this.tlog(
      `TOTALS: Cost: ${this.cFormat(totalCost)} Gain: ${this.cFormat(
        totalGain
      )} Percentage: ${percentageGain}%`
    );
  }
}

export let main = ThisScript.runner();
