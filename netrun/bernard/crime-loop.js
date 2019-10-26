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
    this.stopped = false;
    this.addRemovingButton("Stop Loop", () => {
      this.stopped = true;
      this.ns.stopAction();
    });

    // this.player = new Player(this.ns);
    // await this.player.initPlayerLoop();

    // await this.upgradeHomeRam();
    // await this.player.trainTo("hack", 50);
    // await this.player.trainTo("str", 30);
    // await this.player.trainTo("def", 30);
    let crime = this.ns.args[0] || "homicide";

    while (true) {
      await this.checkStop();
      await this.upgradeHomeRam();
      await this.buyPrograms();

      let result = await this.ns.commitCrime(crime);
      while (this.ns.isBusy() && !this.stopped) {
        await this.sleep(100);
      }
      await this.sleep(100);
    }
  }

  async checkStop() {
    if (!this.stopped) return;
    this.ns.stopAction();
    await this.exit(`Stopped Actions by Server`);
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
    let homeRam = () => this.ns.getServerRam("home")[0];
    if (homeRam() < 1024) {
      let cost = this.ns.getUpgradeHomeRamCost();
      while (
        this.ns.getServerMoneyAvailable("home") > cost &&
        homeRam() < 1024
      ) {
        this.tlog(`Upgrading home ram`);
        await this.ns.upgradeHomeRam();
        await this.sleep(100);
      }
    }
  }
}

export let main = ThisScript.runner();
