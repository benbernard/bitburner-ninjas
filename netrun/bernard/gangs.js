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
  MUG: "Mug People",
  TERROR: "Terrorism",
  TRAFFICK: "Human Trafficking",
  ARMS: "Traffick Illegal Arms",
};

const ASCENDED_STRENGTH_MULT = 48;
const ASCENDED_STR = 4000;
// const ASCENDED_STRENGTH_MULT = 20;

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
    if (this.fullyAscended()) {
      return this.info.defense >= 500 && this.info.strength >= 500;
    } else {
      return this.info.defense >= 120 && this.info.strength >= 120;
    }
  }

  refreshInfo() {
    this.info = this.gang.getMemberInformation(this.name);
    return this.info;
  }

  ascend() {
    let ascensionData = this.gang.ascendMember(this.name);
    this.refreshInfo();

    return ascensionData;
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

  fullyAscended() {
    return (
      this.info.strengthAscensionMult >= ASCENDED_STRENGTH_MULT ||
      this.info.strength >= ASCENDED_STR
    );
  }

  ascensionsNeeded() {
    let multNeeded = ASCENDED_STRENGTH_MULT - this.info.strengthAscensionMult;
    return Math.ceil(multNeeded / 0.37);
  }

  unownedNormalEquipment(es, {includeAugments = true} = {}) {
    return this.unownedEquipment(es).filter(eq => {
      if (eq.isHacking) return false;
      if (!includeAugments && eq.type === EquipmentSet.TYPES.AUGMENT)
        return false;
      return true;
    });
  }

  logInfo() {
    return `${this.name} - ${
      this.task
    }.  Trained: ${this.trained()} Ascended: ${this.fullyAscended()} Ascensions Needed: ${this.ascensionsNeeded()}`;
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

  normalEquipment({includeAugments = true} = {}) {
    return this.infos().filter(eq => {
      if (eq.isHacking) return false;
      if (!includeAugments && eq.type === EquipmentSet.TYPES.AUGMENT)
        return false;
      return true;
    });
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
  AUGMENT: "Augmentation",
};
