import {BaseScript, NSObject} from "./baseScript.js";

let programs = [
  "BruteSSH.exe",
  "FTPCrack.exe",
  "SQLInject.exe",
  "relaySMTP.exe",
  "HTTPWorm.exe",
];

const TOGGLE_FILE = "toggle_file.txt";
const STOP_FILE = "stop_file.txt";

class ThisScript extends BaseScript {
  async perform() {
    await this.ns.wget("http://localhost:3000/toggleStop/no", TOGGLE_FILE);
    // this.player = new Player(this.ns);
    // await this.player.initPlayerLoop();

    // await this.upgradeHomeRam();
    // await this.player.trainTo("hack", 50);
    // await this.player.trainTo("str", 30);
    // await this.player.trainTo("def", 30);

    while (true) {
      await this.checkStop();
      await this.upgradeHomeRam();
      await this.buyPrograms();
      // let result = await this.ns.commitCrime("shoplift");
      // let result = await this.ns.commitCrime("mug");
      let result = await this.ns.commitCrime("homicide");
      while (this.ns.isBusy()) {
        await this.sleep(100);
      }
    }
  }

  async checkStop() {
    await this.ns.wget("http://localhost:3000/shouldStop", STOP_FILE);
    let contents = await this.ns.read(STOP_FILE);
    if (contents.toLowerCase() === "yes") {
      await this.exit(`Stopped Actions by Server`);
    }
  }

  buyPrograms() {
    this.ns.purchaseTor();
    for (let program of programs) {
      this.buyProgram(program);
    }
  }

  allProgramsBought({log = true} = {}) {
    for (let program of programs) {
      if (!this.ns.fileExists(program, "home")) return false;
    }

    if (log) this.tlog("Bought all nuke porgrams!");
    return true;
  }

  buyProgram(program) {
    if (this.ns.fileExists(program, "home")) return;
    let success = this.ns.purchaseProgram(program);
    if (success) this.tlog(`Bought ${program}`);
  }

  async upgradeHomeRam() {
    if (this.ns.getServerRam("home")[0] < 1024) {
      let cost = this.ns.getUpgradeHomeRamCost();
      while (
        this.ns.getServerMoneyAvailable("home") > cost &&
        this.home.ram() < 1024
      ) {
        this.tlog(`Upgrading home ram`);
        await this.ns.upgradeHomeRam();
      }
    }
  }
}

export let main = ThisScript.runner();
