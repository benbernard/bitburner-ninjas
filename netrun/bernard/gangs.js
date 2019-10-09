import {NSObject} from "./baseScript.js";

class GangNSObject extends NSObject {
  get gang() {
    return this.ns.gang;
  }
}

export const TASKS = {
  UNASSIGNED: "Unassigned",
  TRAIN_COMBAT: "Train Combat",
  TERRITORY_WARFARE: "Territory Warfare",
  VIGILANTE_JUSTICE: "Vigilante Justice",
};

export class Gang extends GangNSObject {
  constructor(ns, es) {
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

  trainedMembers() {
    return this.members().filter(m => m.trained());
  }

  canRecruit() {
    return this.gang.canRecruitMember();
  }

  recruit() {
    let name = `Member-${this.uuid()}`;
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

  trained() {
    return this.info.defense >= 120 && this.info.strength >= 120;
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

  unownedEquipment(es) {
    if (!es) es = new EquipmentSet(this.ns);

    let ownedEquipment = new Set();
    this.info.equipment.forEach(name => ownedEquipment.add(name));
    this.info.augmentations.forEach(name => ownedEquipment.add(name));

    return es.sorted().filter(equipment => !ownedEquipment.has(equipment.name));
  }

  unownedNormalEquipment(es) {
    return this.unownedEquipment(es).filter(equipment => !equipment.isHacking);
  }
}

export class EquipmentSet extends NSObject {
  constructor(ns) {
    super(ns);
    this.load();
  }

  load() {
    let equipment = {};
    let gang = this.ns.gang;

    gang.getEquipmentNames().forEach(name => {
      let cost = gang.getEquipmentCost(name);
      let type = gang.getEquipmentType(name);

      let isHacking =
        type === EquipmentSet.TYPES.ROOTKIT ||
        EquipmentSet.HACKING_AUGMENTS.has(name);

      equipment[name] = {
        name,
        cost,
        type,
        isHacking,
      };
    });

    this.equipment = equipment;
  }

  infos() {
    return Object.values(this.equipment);
  }

  whereType(type) {
    let realType = EquipmentSet.TYPES[type];
    return this.infos().filter(i => i.type === realType);
  }

  sortedType(type) {
    return this.whereType(type).sort((a, b) => a.cost - b.cost);
  }

  sorted() {
    return this.infos().sort((a, b) => a.cost - b.cost);
  }

  normalEquipment() {
    return this.infos().filter(eq => !eq.isHacking);
  }
}

EquipmentSet.HACKING_AUGMENTS = new Set([
  "BitWire",
  "Neuralstimulator",
  "DataJack",
]);

EquipmentSet.TYPES = {
  WEAPON: "Weapon",
  ARMOR: "Armor",
  VEHICLE: "Vehicle",
  ROOTKIT: "Rootkit",
  AUGMENTATION: "Augmentation",
};
