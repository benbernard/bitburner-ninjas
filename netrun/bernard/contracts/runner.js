import {DISPATCH} from "../contracts.js";

function run(type, data) {
  let solver = DISPATCH[type];
  console.log(JSON.stringify(solver(data)));
}

// run("Spiralize Matrix", [[1, 2, 3], [4, 5, 6], [7, 8, 9]]);
// run("Spiralize Matrix", [[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12]]);
//
// run("Spiralize Matrix", [[1, 2], [3, 4]]);
// run("Spiralize Matrix", [[1, 2], [3, 4], [5, 6]]);

run("Find All Valid Math Expressions", ["649428446279", 15]);
// run("Find All Valid Math Expressions", ["105", 5]);
