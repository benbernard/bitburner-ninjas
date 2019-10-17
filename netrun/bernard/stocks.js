import {NSObject} from "./baseScript.js";

export class Stock extends NSObject {
  constructor(ns, bank, symbol) {
    super(ns);
    this.bank = bank;
    this.symbol = symbol;
  }

  forecast() {
    return this.ns.getStockForecast(this.symbol);
  }

  position() {
    return Position.create(this.ns, this);
  }

  askPrice() {
    return this.ns.getStockAskPrice(this.symbol);
  }

  bidPrice() {
    return this.ns.getStockBidPrice(this.symbol);
  }

  maxShares() {
    return this.ns.getStockMaxShares(this.symbol);
  }

  purchaseCost(shares) {
    return this.ns.getStockPurchaseCost(this.symbol, shares, "Long");
  }

  async buy(shares) {
    return this.bank.stockBuy(this.symbol, shares);
  }

  async sell(shares) {
    return this.bank.sellStocks({[this.symbol]: shares});
  }

  volatility() {
    return this.ns.getStockVolatility(this.symbol);
  }
}

export class Position extends NSObject {
  constructor(ns, stock) {
    super(ns);
    this.stock = stock;
    this.update();
  }

  hasShares() {
    return this.shares > 0;
  }

  forecast() {
    return this.stock.forecast();
  }

  update() {
    let [
      shares,
      averagePrice,
      shortShares,
      averageShortPrice,
    ] = this.ns.getStockPosition(this.stock.symbol);

    this.shares = shares;
    this.averagePrice = averagePrice;
    this.shortShares = shortShares;
    this.averageShortPrice = averageShortPrice;
  }

  async sell(shares = this.shares) {
    await this.stock.sell(shares);
    this.update();
  }

  async buy(shares) {
    await this.stock.buy(shares);
    this.update();
  }

  cost() {
    return this.shares * this.averagePrice;
  }

  gain() {
    return (
      this.ns.getStockSaleGain(this.stock.symbol, this.shares, "Long") -
      this.cost()
    );
  }

  static create(ns, stock) {
    return new Position(ns, stock);
  }
}

export class Market extends NSObject {
  constructor(ns, bank) {
    super(ns);
    this.bank = bank;
  }
  stocks() {
    return this.ns
      .getStockSymbols()
      .map(sym => new Stock(this.ns, this.bank, sym));
  }

  heldPositions() {
    return this.stocks()
      .map(s => s.position())
      .filter(p => p.hasShares());
  }
}
