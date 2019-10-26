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

export function getCheapAssDocument() {
  // eslint-disable-next-line no-eval
  return eval("document");
}

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

export let _ = {
  isFunction(val) {
    return typeof val === "function";
  },

  isNumber(val) {
    return typeof val === "number";
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

  toArray(iterable) {
    return Array.from(iterable[Symbol.iterator]());
  },

  itReduce(iterable, fn, start) {
    return _.toArray(iterable).reduce(fn, start);
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
