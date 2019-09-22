const triangle = [
  [9],
  [4, 8],
  [4, 7, 9],
  [5, 9, 1, 3],
  [6, 8, 5, 3, 6],
  [2, 4, 8, 5, 8, 9],
  [2, 9, 1, 3, 1, 5, 2],
];

class Point {
  constructor(level, index, sum) {
    this.level = level;
    this.index = index;
    this.sum = sum + this.value();
  }

  value() {
    return triangle[this.level][this.index];
  }

  atEnd() {
    return this.level >= triangle.length - 1;
  }

  newPositions() {
    if (this.atEnd()) return [];
    let newLevel = this.level + 1;
    return [
      new Point(newLevel, this.index, this.sum),
      new Point(newLevel, this.index + 1, this.sum),
    ];
  }

  info() {
    return `[${this.level}, ${this.index}] = ${this.sum}`;
  }
}

let positions = [new Point(0, 0, 0)];
let results = [];

let count = 0;
while (positions.length > 0) {
  let position = positions.shift();
  let [a, b] = position.newPositions();

  if (a.atEnd()) {
    results.push(a);
    results.push(b);
  } else {
    positions.push(a);
    positions.push(b);
  }
  count++;
}

results = results.sort((a, b) => {
  return a.sum - b.sum;
});

console.log(`Min sum: ${results[0].sum}`);
