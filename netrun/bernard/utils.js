import {BaseScript} from "./baseScript.js";

export function convertStrToMoney(str) {
  if (typeof str === "number" || str.match(/^\d+$/)) return parseInt(str);

  let unit = str[str.length - 1];
  let amount = parseInt(str.substring(0, str.length - 1));
  if (!(unit in CONVERSIONS)) {
    throw new Error(
      `Cannot find unit ${unit} in ${JSON.stringify(Object.keys(CONVERSIONS))}`
    );
  }

  return amount * CONVERSIONS[unit];
}

let CONVERSIONS = {
  t: "1000000000000",
  b: "1000000000",
  m: "1000000",
  k: "1000",
};

export function convertToPercent(num) {
  let converted = round2(num * 100);
  return `${converted}%`;
}

export function round2(num) {
  return Math.floor(num * 100) / 100;
}

export function json(...args) {
  return JSON.stringify(...args);
}

export async function copy(text) {
  let result = await navigator.permissions.query({name: "clipboard-write"});
  if (result.state !== "granted")
    throw new Error("No Permission for clipboard: ${result.state}");

  await navigator.clipboard.writeText(text);
}

export function getDocument() {
  // eslint-disable-next-line no-eval
  return eval("document");
  // hel
}

export function addOptionButton(name, fn) {
  let doc = getDocument();
  let id = `option-button-${name}`;
  if (doc.getElementById(id)) {
    doc.getElementById(id).remove();
  }

  let options = doc.getElementsByClassName("character-quick-options")[0];
  let button = doc.createElement("button");

  button.id = id;
  button.className = "character-overview-btn";
  button.style = "margin-top: 5px;";

  button.innerText = name;
  button.addEventListener("click", () => {
    fn();
  });

  options.appendChild(button);

  return () => {
    button.remove();
  };
}

console.log("Inserting add option button");
BaseScript.prototype.addOptionButton = function (name, fn) {
  let remove = addOptionButton(name, fn);
  this.addFinally(() => remove());
};

export let _ = {
  isFunction(val) {
    return typeof val === "function";
  },

  constant(val) {
    return () => val;
  },

  keys(obj) {
    return Object.keys(obj);
  },

  values(obj) {
    return Object.values(obj);
  },

  * hashEach(obj) {
    for (let key of _.keys(obj)) {
      yield [key, obj[key]];
    }
  },
};

export function uuid() {
  return (
    Math.random()
      .toString(36)
      .substring(2, 15) +
    Math.random()
      .toString(36)
      .substring(2, 15)
  );
}
