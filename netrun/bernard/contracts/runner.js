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

// run("Find All Valid Math Expressions", ["649428446279", 15]);
// run("Find All Valid Math Expressions", ["105", 5]);

// run("Sanitize Parentheses in Expression", ")(");
// run("Sanitize Parentheses in Expression", "()())()");
// run("Sanitize Parentheses in Expression", "(a)())()");

// run("Algorithmic Stock Trader II", [10, 11, 12, 8, 10]);
// run("Algorithmic Stock Trader II", [
//   142,
//   17,
//   29,
//   13,
//   8,
//   159,
//   27,
//   100,
//   18,
//   61,
//   159,
//   176,
//   34,
//   63,
//   186,
//   67,
//   170,
//   49,
//   32,
// ]);

run("Minimum Path Sum in a Triangle", [[2], [3, 4], [6, 5, 7], [4, 1, 8, 3]]);
