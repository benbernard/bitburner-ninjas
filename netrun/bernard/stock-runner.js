import * as TK from "./tk.js";
import {Market} from "./stocks.js";

let CONVERSIONS = {
  b: "1000000000",
  t: "1000000000000",
};

let BUY_FORECAST = 0.59;
let SELL_FORECAST = 0.55;

class ThisScript extends TK.Script {
  async perform() {
    this.market = new Market(this.ns);

    this.initBank(this.args[0]);
    this.initPositions();

    this.log(`Bank Size: ${this.cFormat(this.bank)}`);

    this.useAvailableMoney();

    while (true) {
      this.sellLosers();
      this.useAvailableMoney();

      await this.sleep(6000); // Stock updates at 6 seconds
    }
  }

  async useAvailableMoney() {
    this.updateAllPositions();
    let availableMoney = this.availableMoney();

    for (let stock of this.candidateStocks()) {
      this.log(`Considering ${stock.symbol}`);
      let [cost, canBuyMore] = this.buyStock(stock, availableMoney);
      availableMoney -= cost;
      if (availableMoney < this.bank * 0.1) break;
    }

    this.log(`Remaining money: ${this.cFormat(availableMoney)}`);
  }

  sellLosers() {
    let sold = false;
    for (let position of this.heldPositions()) {
      if (position.forecast() < SELL_FORECAST) {
        this.log(
          `Selling ${position.stock.symbold}:${
            position.shares
          } at ${position.stock.bidPrice()}`
        );
        position.sell();
        sold = true;
      }
    }

    return sold;
  }

  heldPositions() {
    return Object.values(this.positions).filter(p => p.hasShares());
  }

  buyStock(stock, money) {
    let position = this.positions[stock.symbol];
    let maxShares = Math.floor(stock.maxShares() * 0.4) - position.shares;
    let shareCost = stock.askPrice();

    let canBuyMore = false;
    let sharesToBuy = Math.floor(money / shareCost);

    if (sharesToBuy > maxShares) {
      sharesToBuy = maxShares;
      canBuyMore = true;
    }

    if (sharesToBuy <= 1) {
      return [0, false];
    }

    let estimatedCost = sharesToBuy * shareCost;

    this.log(
      `Buying ${stock.symbol} at ${shareCost}, buying ${sharesToBuy} shares`
    );

    position.buy(sharesToBuy);

    return [estimatedCost, canBuyMore];
  }

  updateAllPositions() {
    Object.values(this.positions).forEach(p => p.update());
  }

  updatePosition(position) {
    this.positions[position.stock.symbol] = position;
  }

  availableMoney() {
    let available =
      this.bank -
      Object.values(this.positions).reduce((sum, p) => sum + p.cost(), 0);

    this.log(`Found available money: ${this.cFormat(available)}`);
    return available;
  }

  initPositions() {
    this.positions = {};
    this.market
      .stocks()
      .map(s => s.position())
      .forEach(p => (this.positions[p.stock.symbol] = p));
  }

  initBank(str) {
    if (!str) {
      throw new Error(`Must run script with bank argument`);
    } else if (typeof str === "number" || str.match(/^\d+$/)) {
      this.bank = parseInt(str);
    } else {
      let unit = str[str.length - 1];
      let amount = parseInt(str.substring(0, str.length - 1));

      if (!(unit in CONVERSIONS)) {
        throw new Error(
          `Cannot find unit ${unit} in ${JSON.stringify(
            Object.keys(CONVERSIONS)
          )}`
        );
      }

      this.bank = amount * CONVERSIONS[unit];
    }
  }

  candidateStocks() {
    let stocks = this.market.stocks();
    return stocks
      .filter(s => s.forecast() > BUY_FORECAST)
      .sort((a, b) => b.volatility() - a.volatility());
  }
}

export let main = ThisScript.runner();
