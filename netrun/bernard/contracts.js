import {trading1, trading2, trading3, trading4} from "./trading2.js";
import {NSObject, json} from "./baseScript.js";
import validMath from "./validMath.js";

export default class Contract extends NSObject {
  constructor(ns, file, serverName) {
    super(ns);
    this.file = file;
    this.serverName = serverName;
  }

  get cc() {
    return this.ns.codingcontract;
  }

  get type() {
    return this.cc.getContractType(this.file, this.serverName);
  }

  get description() {
    return this.cc.getDescription(this.file, this.serverName);
  }

  get data() {
    return this.cc.getData(this.file, this.serverName);
  }

  get triesLeft() {
    return this.cc.getNumTriesRemaining(this.file, this.serverName);
  }

  attempt(answer) {
    let reward = this.cc.attempt(answer, this.file, this.serverName, {
      returnReward: true,
    });

    if (reward !== "") return reward;
    return false;
  }

  hasSolver() {
    return !!DISPATCH[this.type];
  }

  async solve(submit) {
    let solver = DISPATCH[this.type];
    if (!solver) {
      this.log(`No solver for ${this.type}`);
      return false;
    }

    let solution = await solver(this.data, this.ns);
    this.log(`Solution: ${JSON.stringify(solution)}`);
    if (!submit) return true;

    if (submit) {
      let success = this.attempt(solution);
      if (success) {
        this.log(`SUCCSSFULLY SOLVED! Reward: ${success}`);
      } else {
        this.log("FAILED! Tries left: ${this.triesLeft}");
      }

      return success;
    }
  }
}

async function maxSum(data) {
  let maxSum = 0;
  let subSum = 0;

  for (let d of data) {
    subSum += d;
    if (subSum < 0) subSum = 0;
    if (subSum > maxSum) maxSum = subSum;
  }

  return maxSum;
}

async function gridPathNoObstacles([rows, columns]) {
  let data = [];
  for (let i = 0; i < rows; i++) {
    let row = [];
    for (let j = 0; j < columns; j++) {
      row.push(0);
    }
    data[i] = row;
  }

  return countPaths(data);
}

function gridPathObstacles(data) {
  return countPaths(data, 0, 0);
}

function countPaths(data, x = 0, y = 0) {
  if (data.length <= x) return 0;
  if (data[0].length <= y) return 0;

  if (data[x][y]) return 0;

  if (x === data.length - 1 && y === data[0].length - 1) return 1;

  return countPaths(data, x + 1, y) + countPaths(data, x, y + 1);
}

function largestFactor(target) {
  if (target === 1) return target;
  let factors = [];

  for (let i = 2; i <= Math.floor(target / 2); i++) {
    if (target % i === 0) {
      let isPrime = true;
      for (let p of factors) {
        if (i % p === 0) {
          isPrime = false;
          break;
        }
      }
      if (isPrime) factors.push(i);
    }
  }

  if (factors.length === 0) {
    return target;
  } else {
    return factors[factors.length - 1];
  }
}

// Cheated, didn't actually implement this
function countSums(arrayData) {
  var ways = [];
  ways[0] = 1;

  for (var a = 1; a <= arrayData; a++) {
    ways[a] = 0;
  }

  for (var i = 1; i <= arrayData - 1; i++) {
    for (var j = i; j <= arrayData; j++) {
      ways[j] += ways[j - i];
    }
  }

  return ways[arrayData];
}

function mergeIntervals(intervals, ns) {
  let points = [];
  for (let interval of intervals) {
    points.push([interval[0], 1], [interval[1], -1]);
  }

  points = points.sort((a, b) => {
    return a[0] - b[0];
  });

  let lastPoint = points[0];
  let newPoints = [];
  for (let point of points.slice(1)) {
    if (point[0] !== lastPoint[0]) {
      if (lastPoint[1] !== 0) {
        newPoints.push(lastPoint);
      }
      lastPoint = point;
    } else {
      lastPoint[1] += point[1];
    }
  }

  points = [...newPoints, lastPoint];

  let openCount = points[0][1];
  let start = points[0][0];
  let output = [];

  for (let point of points.slice(1)) {
    if (openCount === 0) {
      start = point[0];
    }
    openCount += point[1];
    if (start !== point[0] && openCount === 0) {
      output.push([start, point[0]]);
    }
  }

  return output;
}

function generateIps(str, ns) {
  if (str.length > 12) return false;

  let ips = [];
  for (let i = 1; i < Math.min(4, str.length); i++) {
    for (let j = i + 1; j < Math.min(i + 4, str.length); j++) {
      for (let k = j + 1; k < Math.min(j + 4, str.length); k++) {
        let octet1 = str.substring(0, i);
        let octet2 = str.substring(i, j);
        let octet3 = str.substring(j, k);
        let octet4 = str.substring(k);
        let ip = [octet1, octet2, octet3, octet4];

        if (checkValidIp(ip)) {
          ips.push(ip.join("."));
        }
      }
    }
  }

  return ips;
}

function checkValidIp(octets) {
  if (octets.length !== 4) return false;
  return octets.every(validOctet);
}

function validOctet(octet) {
  if (octet.length < 1 || octet.length > 3) return false;
  if (octet[0] === "0" && octet.length !== 1) return false;

  let val = parseInt(octet);
  return octet >= 0 && octet <= 255;
}

function spiralize(data) {
  let point = [0, 0];
  let direction = "right";

  let cycle = ["right", "down", "left", "up"];

  let left = 0;
  let right = data[0].length - 1;
  let top = 1;
  let bottom = data.length - 1;

  let output = [data[0][0]];
  let count = 0;
  while (true) {
    let changed = false;
    switch (direction) {
      case "right":
        if (point[1] === right) {
          direction = "down";
          changed = true;
          right--;
        }
        break;
      case "down":
        if (point[0] === bottom) {
          direction = "left";
          changed = true;
          bottom--;
        }
        break;
      case "left":
        if (point[1] === left) {
          direction = "up";
          changed = true;
          left++;
        }
        break;
      case "up":
        if (point[0] === top) {
          changed = true;
          direction = "right";
          top++;
        }
        break;
    }

    let end = false;
    switch (direction) {
      case "right":
        point[1]++;
        if (point[1] > right) end = true;
        break;
      case "down":
        point[0]++;
        if (point[0] > bottom) end = true;
        break;
      case "left":
        point[1]--;
        if (point[1] < left) end = true;
        break;
      case "up":
        point[0]--;
        if (point[0] < top) end = true;
        break;
    }

    if (output.length === data.length * data[0].length) break;

    output.push(data[point[0]][point[1]]);
  }

  return output;
}

function jumps(arr) {
  let seen = {[arr.length - 1]: true};

  // eslint-disable-next-line for-direction
  for (let i = arr.length - 2; i >= 0; i--) {
    let value = arr[i];

    let reachesEnd = false;
    for (let j = i; j <= i + value; j++) {
      if (j >= arr.length - 1) {
        reachesEnd = true;
        break;
      } else if (seen[j]) {
        reachesEnd = true;
        break;
      }
    }

    seen[i] = reachesEnd;
  }

  if (seen[0]) return 1;
  return 0;
}

class ParenData {
  constructor(str, count, edits) {
    this.str = str;
    this.count = count;
    this.edits = edits;
  }

  makeChildren(char) {
    let children = [];
    if (char === "(") {
      children.push(new ParenData(this.str + char, this.count + 1, this.edits));
      children.push(new ParenData(this.str, this.count, this.edits + 1));
    } else if (char === ")") {
      if (this.count > 0) {
        children.push(
          new ParenData(this.str + char, this.count - 1, this.edits)
        );
      }
      children.push(new ParenData(this.str, this.count, this.edits + 1));
    } else {
      children.push(new ParenData(this.str + char, this.count, this.edits));
    }

    return children;
  }
}

function sanitizeParens(data) {
  let openCount = 0;

  let position = 0;
  let candidates = [new ParenData("", 0, 0)];

  for (let char of data) {
    let newCandidates = [];
    for (let pd of candidates) {
      newCandidates.push(...pd.makeChildren(char));
    }

    candidates = newCandidates;
  }

  let sortedValid = candidates
    .filter(pd => pd.count === 0)
    .sort((a, b) => a.edits - b.edits);

  if (sortedValid.length === 0) return [""];

  let minEdits = sortedValid[0].edits;
  return [
    ...new Set(
      sortedValid.filter(pd => pd.edits === minEdits).map(pd => pd.str)
    ),
  ];
}

class TrianglePoint {
  constructor(level, index, sum, data) {
    this.level = level;
    this.index = index;
    this.data = data;
    this.sum = sum + this.value();
  }

  value() {
    return this.data[this.level][this.index];
  }

  atEnd() {
    return this.level >= this.data.length - 1;
  }

  newPositions() {
    if (this.atEnd()) return [];
    let newLevel = this.level + 1;
    return [
      new TrianglePoint(newLevel, this.index, this.sum, this.data),
      new TrianglePoint(newLevel, this.index + 1, this.sum, this.data),
    ];
  }

  info() {
    return `[${this.level}, ${this.index}] = ${this.sum}`;
  }
}

function trianglePath(data) {
  let positions = [new TrianglePoint(0, 0, 0, data)];
  let results = [];

  if (data.length === 1) {
    return data[0][0];
  }

  let count = 0;
  while (positions.length > 0) {
    let position = positions.shift();
    let [a, b] = position.newPositions();

    if (a == null || b == null) {
      continue;
    }

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

  return results[0].sum;
}

let DISPATCH = {
  "Subarray with Maximum Sum": maxSum,
  "Unique Paths in a Grid I": gridPathNoObstacles,
  "Unique Paths in a Grid II": gridPathObstacles,
  "Find Largest Prime Factor": largestFactor,
  "Total Ways to Sum": countSums,
  "Merge Overlapping Intervals": mergeIntervals,
  "Generate IP Addresses": generateIps,
  "Spiralize Matrix": spiralize,
  "Find All Valid Math Expressions": validMath,
  "Array Jumping Game": jumps,
  "Sanitize Parentheses in Expression": sanitizeParens,
  "Minimum Path Sum in a Triangle": trianglePath,
  "Algorithmic Stock Trader I": trading1,
  "Algorithmic Stock Trader II": trading2,
  "Algorithmic Stock Trader III": trading3,
  "Algorithmic Stock Trader IV": trading4,
};

export {DISPATCH};
