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
