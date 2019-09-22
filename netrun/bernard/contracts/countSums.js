import {DISPATCH} from "../contracts.js";

function run(type, data) {
  let solver = DISPATCH[type];
  console.log(JSON.stringify(solver(data)));
}

run("Spiralize Matrix", [[1, 2, 3], [4, 5, 6], [7, 8, 9]]);
