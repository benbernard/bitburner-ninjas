import {NSObject} from "./baseScript.js";
import {json} from "./utils.js";

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
  CYBER_TERROR: "Cyberterrorism",
  TRAFFICK: "Human Trafficking",
  ARMS: "Traffick Illegal Arms",
  TRAIN_HACK: "Train Hacking",
  RANSOM: "Ransomware",
  MONEY: "Money Laundering",
};

const ALLOWED_EQUIPMENT = new Set([
  "Katana",
  "ATX1070 Superbike",
  "Baseball Bat",
]);

const ALLOWED_HACKING_EQUIPMENT = new Set(["NUKE Rootkit"]);

export const HACKING_GANG = true;
// const ASCENDED_HACKING_MULT = 40;
const ASCENDED_HACKING_MULT = 100;
const ASCENDED_HACKING = 15000;
const GREATLY_ASCENDED_HACKING_MULT = 300;

const GREATLY_ASCENDED_STRENGTH_MULT = 100000;
const ASCENDED_STR = 1000000;
const ASCENDED_STRENGTH_MULT = 100000;
// const ASCENDED_STR = 4000;
// const ASCENDED_STRENGTH_MULT = 10;
// const ASCENDED_STRENGTH_MULT = 20;

const USE_LIMITED_EQUIPMENT = true;

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
    let name = `${this.uuid()}`;
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
    this._info = info;
  }

  trained() {
    if (HACKING_GANG) {
      if (this.fullyAscended()) {
        return this.info.hacking >= 700;
      } else {
        return this.info.hacking >= 50;
      }
    } else if (this.fullyAscended()) {
      return this.info.defense >= 700 && this.info.strength >= 700;
    } else {
      return this.info.defense >= 120 && this.info.strength >= 120;
    }
  }

  get info() {
    if (this.needsRefresh || !this._info) this.refreshInfo();
    this.needsRefresh = false;
    return this._info;
  }

  refreshInfo() {
    this._info = this.gang.getMemberInformation(this.name);
    return this._info;
  }

  ascend() {
    let ascensionData = this.gang.ascendMember(this.name);
    this.needsRefresh = true;
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

    let ownedEquipment = this.ownedEquipment();

    let filterFn = this.fullyAscended() ? _.constant(true) : allowedEquipment;

    return es
      .sorted()
      .filter(eq => !ownedEquipment.has(eq.name))
      .filter(filterFn);
  }

  ownedEquipment() {
    let ownedEquipment = new Set();
    this.info.equipment.forEach(name => ownedEquipment.add(name));
    this.info.augmentations.forEach(name => ownedEquipment.add(name));
    return ownedEquipment;
  }

  fullyAscended() {
    if (HACKING_GANG) {
      return (
        this.info.hackingAscensionMult >= ASCENDED_HACKING_MULT ||
        this.info.hacking >= ASCENDED_HACKING
      );
    } else {
      return (
        this.info.strengthAscensionMult >= ASCENDED_STRENGTH_MULT ||
        this.info.strength >= ASCENDED_STR
      );
    }
  }

  greatlyAscended() {
    if (HACKING_GANG) {
      return this.info.hackingAscensionMult >= GREATLY_ASCENDED_HACKING_MULT;
    } else {
      return this.info.strengthAscensionMult >= GREATLY_ASCENDED_STRENGTH_MULT;
    }
  }

  hasAscendedAugments(es) {
    let ownedEquipment = this.ownedEquipment();
    for (let equipment of es.ascendedEquipment()) {
      if (!ownedEquipment.has(equipment.name)) return false;
    }
    return true;
  }

  unownedAscendedAugments(es) {
    let ownedEquipment = this.ownedEquipment();

    return es.ascendedEquipment().filter(eq => !ownedEquipment.has(eq.name));
  }

  ascensionsNeeded(overrideMult = false) {
    if (HACKING_GANG) {
      let multNeeded =
        ASCENDED_HACKING_MULT -
        (overrideMult ? 1 : this.info.hackingAscensionMult);
      if (USE_LIMITED_EQUIPMENT) {
        return Math.ceil(multNeeded / 0.0075);
      }

      return Math.ceil(multNeeded / 0.1066);
    } else {
      let multNeeded =
        ASCENDED_STRENGTH_MULT -
        (overrideMult ? 1 : this.info.strengthAscensionMult);
      if (USE_LIMITED_EQUIPMENT) {
        return Math.ceil(multNeeded / 0.0185);
      }

      return Math.ceil(multNeeded / 0.37);
    }
  }

  unownedNormalEquipment(es, {includeAugments = true} = {}) {
    return this.unownedEquipment(es).filter(eq => {
      if (eq.isHacking !== HACKING_GANG) return false;
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

  get(name) {
    return this.equipment[name];
  }

  ascendedEquipment() {
    return this.sorted().filter(eq => eq.isHacking === HACKING_GANG);
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
    return this.infos()
      .filter(eq => {
        if (!includeAugments && eq.type === EquipmentSet.TYPES.AUGMENT)
          return false;
        return true;
      })
      .filter(eq => eq.isHacking === HACKING_GANG)
      .filter(allowedEquipment);
  }

  static availableAugments() {
    if (HACKING_GANG) return this.HACKING_AUGMENTS;
    return this.ASCENDED_AUGMENTS;
  }
}

function allowedEquipmentSet() {
  if (HACKING_GANG) return ALLOWED_HACKING_EQUIPMENT;
  return ALLOWED_EQUIPMENT;
}

function allowedEquipment(eq) {
  // Disable this for now
  if (!USE_LIMITED_EQUIPMENT) return true;

  return allowedEquipmentSet().has(eq.name);
}

EquipmentSet.HACKING_AUGMENTS = new Set([
  "BitWire",
  "Neuralstimulator",
  "DataJack",
]);

EquipmentSet.ASCENDED_AUGMENTS = new Set([
  "Bionic Arms",
  "Bionic Spine",
  "Bionic Legs",
  "BrachiBlades",
  "Nanofiber Weave",
  "Synthetic Heart",
  "Synfibril Muscle",
  "Graphene Bone Lacings",
]);

EquipmentSet.TYPES = {
  WEAPON: "Weapon",
  ARMOR: "Armor",
  VEHICLE: "Vehicle",
  ROOTKIT: "Rootkit",
  AUGMENT: "Augmentation",
};
