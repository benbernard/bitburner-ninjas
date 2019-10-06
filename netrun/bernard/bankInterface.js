import {BaseScript, NSObject} from "./baseScript.js";

const REQUEST_PORT = 1;
const RESPONSE_PORT = 2;

export class BankInterface extends NSObject {
  requestHandle() {
    return this.ns.getPortHandle(REQUEST_PORT);
  }

  responseHandle() {
    return this.ns.getPortHandle(RESPONSE_PORT);
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

  async createMessage(data, metadata = {}) {
    let handle = this.requestHandle();

    let message = {
      uuid: this.uuid(),
      data,
      ...metadata,
    };
  }

  async sendResponse(request, data) {
    let response = this.createMessage(data, {
      responseTo: request.uuid,
    });

    this.responseHandle().write(response);
  }

  async sendAndWait(request) {
    let requestHandle = this.requestHandle();
    if (!request.uuid) request = this.createRequest(request);

    let uuid = request.uuid;
    requestHandle.write(request);

    let handle;
    while (true) {
      await this.sleep(10);
      handle = this.responseHandle();
      if (handle.data.length > 1) {
        let response = handle.find(msg => msg.responseTo === uuid);
        handle.data = handle.filter(msg => msg !== response);
        return response;
      }
    }
  }
}
