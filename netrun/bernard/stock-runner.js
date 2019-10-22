import * as TK from "./tk.js";
import {BankMessaging} from "./messaging.js";
import {Market} from "./stocks.js";
import {convertStrToMoney} from "./baseScript.js";

let BUY_FORECAST = 0.59;
let SELL_FORECAST = 0.55;

class ThisScript extends TK.Script {
  async perform() {
    this.bank = new BankMessaging(this.ns);
    this.market = new Market(this.ns, this.bank);

    this.initPositions();

    await this.useAvailableMoney();

    while (true) {
      await this.sellLosers();
      await this.useAvailableMoney();

      await this.sleep(6000); // Stock updates at 6 seconds
    }
  }

  async useAvailableMoney() {
    this.updateAllPositions();

    let wallet = await this.bank.walletInfo("stocks");
    let availableMoney = wallet.amount;

    for (let stock of this.candidateStocks()) {
      this.log(`Considering ${stock.symbol}`);
      let [cost, canBuyMore] = await this.stockBuy(stock, availableMoney);
      availableMoney -= cost;
      if (availableMoney < this.bank * 0.1) break;
    }

    this.log(`Remaining money: ${this.cFormat(availableMoney)}`);
  }

  async sellLosers() {
    let sold = false;
    let sells = {};
    for (let position of this.heldPositions()) {
      if (position.forecast() < SELL_FORECAST) {
        this.log(
          `Selling ${position.stock.symbold}:${
            position.shares
          } at ${position.stock.bidPrice()}`
        );
        sells[position.stock.symbol] = position.shares;
        sold = true;
      }
    }

    await this.bank.sellStocks(sells);
    this.updateAllPositions();
    return sold;
  }

  heldPositions() {
    return Object.values(this.positions).filter(p => p.hasShares());
  }

  async stockBuy(stock, money) {
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

    await position.buy(sharesToBuy);
    return [estimatedCost, canBuyMore];
  }

  updateAllPositions() {
    Object.values(this.positions).forEach(p => p.update());
  }

  updatePosition(position) {
    this.positions[position.stock.symbol] = position;
  }

  initPositions() {
    this.positions = {};
    this.market
      .stocks()
      .map(s => s.position())
      .forEach(p => (this.positions[p.stock.symbol] = p));
  }

  candidateStocks() {
    let stocks = this.market.stocks();
    return stocks
      .filter(s => s.forecast() > BUY_FORECAST)
      .sort((a, b) => b.volatility() - a.volatility());
  }
}

export let main = ThisScript.runner();
