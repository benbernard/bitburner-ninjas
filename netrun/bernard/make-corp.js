import * as TK from "./tk.js";
import {_} from "./utils.js";

let $ = window.$;

let CITIES = [
  "Sector-12",
  "Ishima",
  "Aevum",
  "Chongqing",
  "New Tokyo",
  "Volhaven",
];

class ThisScript extends TK.Script {
  async perform() {
    await this.appendJquery();

    let mode = this.pullFirstArg() || "create";

    if (mode === "buy") {
      let amount = this.pullFirstArg();
      if (amount == null) return this.exit(`No amount set?`);

      await this.setBuys(amount);
    } else if (mode === "create") {
      this.createCorp();
      this.$corpBtn.click();

      this.createDivison();
      this.buyCorpUpgrades();
      this.$division.click();

      for (let city of CITIES) {
        await this.setupLocation(city);
      }
    } else {
      this.exit(`Unknown mode: ${mode}`);
    }
  }

  async setBuys(amount) {
    this.openAccordion(this.$world);
    this.$corpBtn.click();
    this.$division.click();

    for (let city of CITIES) {
      let tab = this.cityTab(city);
      tab.click();

      this.$realEstateBuyBtn.click();
      this.tlog(`Setting ${city} to buy ${amount} real estate`);
      if (amount > 0) {
        this.$buyAmount.val(amount);
        this.$buyConfirm.click();
      } else {
        this.$buyClear.click();
      }
    }
  }

  buyCorpUpgrades() {
    this.$mainTab.click();
    if (this.$smartSupplyUpgrade.exists()) {
      this.$smartSupplyUpgrade.click();
    }

    if (this.$dreamsenseUpgrade.exists()) {
      this.$dreamsenseUpgrade.click();
    }
  }

  storageMax() {
    return parseFloat(
      this.$warehousePanel.text().match(/Storage: [0-9.]+ \/ ([0-9.]+)/)[1]
    );
  }

  cityTab(name) {
    return $(`.cmpy-mgmt-city-tab:contains('${name}')`);
  }

  async setupLocation(name) {
    let $elem = this.cityTab(name);

    if (!$elem.exists()) {
      this.$expandCity.click();
      this.$citySelect.val(name);
      this.$cityConfirm.click();

      $elem = this.cityTab(name);
    }

    $elem.click();

    if (this.$purchaseWarehouse.exists()) {
      this.$purchaseWarehouse.click();
    }

    while (this.storageMax() < 200) {
      this.$upgradeWarehouse.click();
    }

    while (this.employeeCount() < 3) {
      await this.hireEmployee();
    }

    let btns = this.$addEmployeeBtns;
    if (btns.length === 6) {
      btns[0].click();
      btns[1].click();
      btns[2].click();
    }

    this.applyCoffee();
    await this.throwParties();

    this.$advertUpgrade1.click();
    this.$advertUpgrade2.click();
    this.$advertUpgrade3.click();

    if (!this.$smartSupply[0].checked) {
      this.clickSmartSupply();
    }

    await this.setSell(this.$foodSellBtn);
    await this.setSell(this.$plantsSellBtn);
  }

  // Have to do this due to react being crazy
  clickSmartSupply() {
    // eslint-disable-next-line
    let event = new MouseEvent("click", {
      view: window,
      bubbles: true,
      cancelable: false,
    });
    this.$smartSupply[0].dispatchEvent(event);
  }

  async setSell($btn) {
    $btn.click();

    this.$sellAmount.val("MAX");
    this.$sellPrice.val("MP");
    this.$sellConfirm.click();
  }

  async throwParties() {
    while (this.happiness() < 99.99 || this.morale < 99.99) {
      this.tlog(`Throwing party`);
      this.$party.click();
      this.$partyAmount.val(10000000);
      this.$confirmParty.click();
      this.$employeePanel.click();
      await this.sleep(2000);
    }
  }

  happiness() {
    return parseFloat(
      this.$employeePanel.text().match(/Avg Employee Happiness: ([0-9.]+)/)[1]
    );
  }

  morale() {
    return parseFloat(
      this.$employeePanel.text().match(/Avg Employee Morale: ([0-9.]+)/)[1]
    );
  }

  energy() {
    return parseFloat(
      this.$employeePanel.text().match(/Avg Employee Energy: ([0-9.]+)/)[1]
    );
  }

  applyCoffee() {
    while (this.energy() < 100) {
      this.$coffee.click();
    }
  }

  employeeCount() {
    return parseInt(this.$employeePanel.text().match(/Size: (\d+) \/ \d+/)[1]);
  }

  async hireEmployee() {
    this.$hireBtn.click();
    await this.sleep(100);
    for (let elem of this.$employeeOptions) {
      let $elem = $(elem);
      if ($elem.text().match(/Salary: \$\d\.\d{3}k/)) {
        $elem.click();
        this.$employeeName.val(this.uuid());
        this.$confirmHire.click();
        return;
      }
    }

    this.$hireCancel[0].click();
  }

  createDivison() {
    if (this.$division.exists()) return;

    this.$corpBtn.click();
    this.$expandIndustry.click();
    this.$expandName.val("NO Insider Trading");
    this.$createDivision.click();
  }

  createCorp() {
    this.openAccordion(this.$world);
    if (!this.$corpBtn.attr("style").match(/opacity: 1/)) return;

    this.openCity();

    this.$cityHall.click();
    this.$createCorp.click();
    this.$corpName.val("Excellent Corp");
    this.$seedMoney.click();
  }

  openTerminal() {
    this.openAccordion(this.$hacking);
    this.$terminal.click();
  }

  openAccordion($elem) {
    if ($elem.hasClass("opened")) return;
    $elem.click();
  }

  openCity() {
    this.openAccordion(this.$world);
    this.$city.click();
  }

  async appendJquery() {
    if (typeof window.$ === "undefined") {
      this.tlog("Appending jquery");
      var s = document.createElement("script");
      s.type = "text/javascript";
      s.src = "https://code.jquery.com/jquery-3.4.1.slim.js";
      document.getElementsByTagName("head")[0].appendChild(s);
      await this.sleep(1000);
      $ = window.$;
    }

    for (let [name, fn] of _.hashEach(JQ_METHODS)) {
      $.fn[name] = fn;
    }
  }
}

const JQ_METHODS = {
  exists: function () {
    return this.length > 0;
  },
};

function makeComponent(selector) {
  return () => $(selector);
}

const COMPONENTS = {
  world: "#world-menu-header",
  city: "#city-menu-link",
  cityHall: '.std-button:contains("Sector-12 City Hall")',
  createCorp: '.std-button:contains("Create a Corporation")',
  corpName: 'input[placeholder="Corporation Name"]',
  terminal: "#terminal-menu-link",
  hacking: "#hacking-menu-header",
  seedMoney: '.popup-box-button:contains("Use Seed Money")',
  createDivision: '.popup-box-button:contains("Create Division")',
  corpBtn: "#corporation-menu-link",
  expandIndustry: '.cmpy-mgmt-header-tab:contains("Expand into new Industry")',
  division: '.cmpy-mgmt-header-tab:contains("NO Insider Trading")',
  expandName: "#cmpy-mgmt-expand-industry-name-input",
  mainTab: '.cmpy-mgmt-header-tab:contains("Excellent Corp")',
  smartSupplyUpgrade:
    '.cmpy-mgmt-upgrade-div:contains("Smart Supply - $25.000b")',
  smartSupply: "#cmpy-mgmt-smart-supply-checkbox",
  hireBtn: '.std-button:contains("Hire Employee")',
  employeeOptions: ".cmpy-mgmt-find-employee-option",
  hireCancel: '.a-link-button:contains("Cancel")',
  employeeName: "#yes-no-text-input-box-input",
  confirmHire: '.popup-box-button:contains("Hire")',
  employeePanel: ".cmpy-mgmt-employee-panel",
  coffee: '.cmpy-mgmt-upgrade-div:contains("Coffee")',
  party: '.std-button:contains("Throw Party")',
  partyAmount: 'input[placeholder="$ / employee"]',
  confirmParty:
    '#cmpy-mgmt-throw-office-party-popup .std-button:contains("Throw Party")',

  realEstateBuyBtn:
    '.cmpy-mgmt-warehouse-material-div:contains("Real Estate") .std-button:contains("Buy")',
  foodSellBtn:
    '.cmpy-mgmt-warehouse-material-div:contains("Food") .std-button:contains("Sell")',
  plantsSellBtn:
    '.cmpy-mgmt-warehouse-material-div:contains("Plants") .std-button:contains("Sell")',
  sellAmount: 'input[placeholder="Sell amount"]',
  sellPrice: 'input[placeholder="Sell price"]',
  sellConfirm: '.std-button:contains("Confirm")',
  addEmployeeBtns: '.cmpy-mgmt-employee-panel .std-button:contains("+")',
  warehousePanel: ".cmpy-mgmt-warehouse-panel",
  expandCity: '.cmpy-mgmt-city-tab:contains("Expand into new City")',
  citySelect: "#cmpy-mgmt-expand-city-popup-content select",
  cityConfirm:
    '#cmpy-mgmt-expand-city-popup-content .std-button:contains("Confirm")',
  purchaseWarehouse:
    '.cmpy-mgmt-warehouse-panel .std-button:contains("Purchase Warehouse")',
  upgradeWarehouse:
    '.cmpy-mgmt-warehouse-panel .std-button:contains("Upgrade Warehouse")',
  dreamsenseUpgrade: '.cmpy-mgmt-upgrade-div:contains("DreamSense - $4.000b")',
  buyAmount: 'input[placeholder="Purchase amount"]',
  buyConfirm: '.std-button:contains("Confirm")',
  buyClear: '.std-button:contains("Clear Purchase")',
  advertUpgrade1: '.cmpy-mgmt-upgrade-div:contains("AdVert.Inc - $1.000b")',
  advertUpgrade2: '.cmpy-mgmt-upgrade-div:contains("AdVert.Inc - $1.060b")',
  advertUpgrade3: '.cmpy-mgmt-upgrade-div:contains("AdVert.Inc - $1.124b")',
};

for (let [name, selector] of _.hashEach(COMPONENTS)) {
  Object.defineProperty(ThisScript.prototype, `$${name}`, {
    get: makeComponent(selector),
  });
}

export let main = ThisScript.runner();
