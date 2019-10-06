import {NSObject} from "./baseScript.js";

class GangNSObject extends NSObject {
  get gang() {
    return this.ns.gang;
  }
}

export const TASKS = {
  UNASSIGNED: "Unassigned",
  TRAIN_COMBAT: "Train Combat",
};

export class Gang extends GangNSObject {
  constructor(ns) {
    super(ns);
    this.refreshNames();
    this.taskNames = this.gang.getTaskNames();
  }

  refreshNames() {
    this.memberNames = this.gang.getMemberNames();
    return this.memberNames;
  }

  members() {
    return this.memberNames.map(name => new Member(this.ns, name));
  }

  canRecruit() {
    return this.gang.canRecruitMember();
  }

  recruit() {
    let name = `Member-${this.memberCount()}`;
    let result = this.gang.recruitMember(name);
    if (!result) throw new Error(`Could not recruit ${name}`);

    this.refreshNames();
    return new Member(this.ns, name);
  }

  memberCount() {
    return this.gang.getMemberNames().length;
  }
}

export class Member extends GangNSObject {
  constructor(ns, name, info) {
    super(ns);
    this.name = name;
    this.info = info;

    if (!info) {
      this.refreshInfo();
    }
  }

  refreshInfo() {
    this.info = this.gang.getMemberInformation(this.name);
    return this.info;
  }

  get task() {
    return this.info.task;
  }

  isWorking() {
    return this.info.task !== TASKS.UNASSIGNED;
  }

  setTask(task) {
    return this.gang.setMemberTask(this.name, task);
  }
}
