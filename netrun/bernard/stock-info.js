import * as TK from "./tk.js";
import {Market} from "./stocks.js";

class ThisScript extends TK.Script {
  async perform() {
    this.market = new Market(this.ns);

    let stocks = this.market.stocks();

    for (let stock of stocks.sort((a, b) => b.forecast() - a.forecast())) {
      this.tlog(`Stock: ${stock.symbol} - Forecast: ${stock.forecast()}`);
    }
  }
}

export let main = ThisScript.runner();
