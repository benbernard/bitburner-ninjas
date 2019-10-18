import * as TK from "./tk.js";

class ThisScript extends TK.Script {
  async perform() {
    let equipment = {};
    let gang = this.ns.gang;

    gang.getEquipmentNames().forEach(name => {
      let cost = gang.getEquipmentCost(name);
      let type = gang.getEquipmentType(name);
      equipment[name] = {
        name,
        cost,
        type,
      };
    });

    let contents = JSON.stringify(equipment, null, 2);
    this.ns.write("equipment-info.txt", contents, "w");
  }
}

export let main = ThisScript.runner();
