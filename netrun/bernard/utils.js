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

export function json(obj) {
  return JSON.stringify(obj);
}

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
