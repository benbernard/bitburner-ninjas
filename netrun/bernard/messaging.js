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
    return this.ns.getPortHandle(this.requestPort);
  }

  responseHandle() {
    return this.ns.getPortHandle(this.responsePort);
  }

  uuid() {
    return (
      Math.random()
        .toString(36)
        .substring(2, 15) +
      Math.random()
        .toString(36)
        .substring(2, 15)
    );
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
        throw new Error(
          `TIMEOUT: No response received for ${JSON.stringify(request)}`
        );
      }

      await this.sleep(100);
      if (handle.data.length > 1) {
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
}

BankMessaging.WALLET_INFO = "wallet_info";
BankMessaging.PURCHASE_SERVER = "purchase_server";
BankMessaging.PURCHASE_EQUIPMENT = "purchase_equipment";
BankMessaging.DEPOSIT = "deposit";
