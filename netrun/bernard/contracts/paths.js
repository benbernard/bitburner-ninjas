let data = [
  [0, 0, 0, 0, 0, 1, 1, 0, 0],
  [0, 0, 0, 1, 0, 0, 0, 0, 0],
  [0, 1, 0, 0, 0, 0, 0, 0, 0],
];

function countPaths(data, x, y) {
  if (data.length <= x) return 0;
  if (data[0].length <= y) return 0;

  if (data[x][y]) return 0;

  if (x === data.length - 1 && y === data[0].length - 1) return 1;

  return countPaths(data, x + 1, y) + countPaths(data, x, y + 1);
}

console.log(countPaths(data, 0, 0));
