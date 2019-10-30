import {BaseScript, NSObject} from "./baseScript.js";

const BANK_REQUEST_PORT = 1;
const BANK_RESPONSE_PORT = 2;

export class Messaging extends NSObject {
  constructor(ns, requestPort, responsePort) {
    super(ns);
    this.requestPort = requestPort;
    this.responsePort = responsePort;
  }

  requestHandle() {
    if (!this._requestHandle)
      this._requestHandle = this.ns.getPortHandle(this.requestPort);
    return this._requestHandle;
  }

  responseHandle() {
    if (!this._responseHandle)
      this._responseHandle = this.ns.getPortHandle(this.responsePort);
    return this._responseHandle;
  }

  createMessage(data, metadata = {}) {
    return {
      uuid: this.uuid(),
      data,
      ...metadata,
    };
  }

  sendResponse(request, data) {
    let response = this.createMessage(data, {
      responseTo: request.uuid,
    });

    this.responseHandle().write(response);
  }

  async sendAndWait(request) {
    let requestHandle = this.requestHandle();
    if (!request.uuid) request = this.createMessage(request);

    let uuid = request.uuid;
    requestHandle.write(request);

    let handle = this.responseHandle();
    let limit = 20;
    let count = 0;
    while (true) {
      count++;
      if (count > limit) {
        let msg = `TIMEOUT: No response received for ${JSON.stringify(
          request
        )} handleData: ${JSON.stringify(handle.data)}`;
        this.log(msg);
        throw new Error(msg);
      }

      await this.sleep(100);
      if (handle.data.length > 0) {
        let response = handle.data.find(msg => msg.responseTo === uuid);
        if (!response) continue;

        let index = handle.data.indexOf(response);
        handle.data.splice(index, 1);

        return response.data;
      }
    }
  }
}

export class BankMessaging extends Messaging {
  constructor(ns) {
    super(ns, BANK_REQUEST_PORT, BANK_RESPONSE_PORT);
  }

  walletInfo(name) {
    return this.sendAndWait({
      type: BankMessaging.WALLET_INFO,
      wallet: name,
    });
  }

  buyServer(serverName, ram) {
    return this.sendAndWait({
      type: BankMessaging.PURCHASE_SERVER,
      wallet: "servers",
      serverName,
      ram,
    });
  }

  buyEquipment(memberName, equipmentName) {
    return this.sendAndWait({
      type: BankMessaging.PURCHASE_EQUIPMENT,
      wallet: "gang",
      memberName,
      equipmentName,
    });
  }

  deposit(wallet, amount) {
    return this.sendAndWait({
      type: BankMessaging.DEPOSIT,
      wallet,
      amount,
    });
  }

  // Pairs of wallet name and amount to set to
  setBalances(pairs) {
    return this.sendAndWait({
      type: BankMessaging.SET_BALANCES,
      sets: pairs,
    });
  }

  stockBuy(symbol, shares) {
    return this.sendAndWait({
      type: BankMessaging.STOCK_BUY,
      symbol,
      shares,
      wallet: "stocks",
    });
  }

  sellStocks(sells) {
    return this.sendAndWait({
      type: BankMessaging.SELL_STOCKS,
      sells,
      wallet: "stocks",
    });
  }

  allWallets() {
    return this.sendAndWait({type: BankMessaging.ALL_WALLETS});
  }

  clear() {
    return this.sendAndWait({type: BankMessaging.CLEAR});
  }

  balanceAccounts() {
    return this.sendAndWait({type: BankMessaging.BALANCE_ACCOUNTS});
  }

  withdraw(wallet, amount) {
    return this.sendAndWait({
      type: BankMessaging.WITHDRAW,
      wallet,
      amount,
    });
  }
}

// Message types
BankMessaging.WALLET_INFO = "wallet_info";
BankMessaging.PURCHASE_SERVER = "purchase_server";
BankMessaging.PURCHASE_EQUIPMENT = "purchase_equipment";
BankMessaging.DEPOSIT = "deposit";
BankMessaging.SET_BALANCES = "set_balances";
BankMessaging.ALL_WALLETS = "all_wallets";
BankMessaging.CLEAR = "clear";
BankMessaging.STOCK_BUY = "stock_buy";
BankMessaging.SELL_STOCKS = "sell_stocks";
BankMessaging.WITHDRAW = "withdraw";
BankMessaging.BALANCE_ACCOUNTS = "balance_accounts";
