import {DISPATCH} from "../contracts.js";

function run(type, data) {
  let solver = DISPATCH[type];
  console.log(JSON.stringify(solver(data)));
}

run("Merge Overlapping Intervals", [
  [3, 12],
  [3, 4],
  [4, 6],
  [11, 21],
  [25, 32],
  [23, 28],
  [16, 26],
  [14, 21],
  [8, 14],
  [5, 11],
  [24, 34],
  [7, 15],
  [11, 18],
  [13, 18],
  [8, 16],
  [14, 22],
  [3, 11],
  [16, 22],
  [5, 12],
  [4, 11],
]);

// run("Merge Overlapping Intervals", [
//   [5, 9],
//   [14, 24],
//   [7, 17],
//   [25, 35],
//   [2, 10],
//   [5, 11],
//   [17, 20],
//   [16, 19],
//   [11, 16],
//   [14, 24],
//   [24, 30],
//   [10, 14],
//   [8, 17],
// ]);

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

// run("Minimum Path Sum in a Triangle", [[2], [3, 4], [6, 5, 7], [4, 1, 8, 3]]);

// run("Unique Paths in a Grid II", [
//   [0, 1, 0, 0, 0],
//   [0, 0, 0, 0, 0],
//   [0, 0, 0, 1, 0],
//   [1, 0, 0, 1, 0],
//   [1, 0, 1, 0, 0],
//   [0, 0, 0, 0, 0],
// ]);

// run("Algorithmic Stock Trader IV", [
//   9,
//   [
//     113,
//     104,
//     98,
//     149,
//     184,
//     34,
//     60,
//     86,
//     133,
//     62,
//     103,
//     163,
//     98,
//     112,
//     181,
//     142,
//     52,
//     88,
//     40,
//     18,
//     74,
//     161,
//     92,
//     115,
//     196,
//     7,
//     132,
//     128,
//     132,
//     94,
//     175,
//     161,
//     134,
//     22,
//     72,
//     11,
//     93,
//     21,
//     143,
//     163,
//   ],
// ]);
