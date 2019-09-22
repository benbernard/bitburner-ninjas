import {trading1, trading3} from "./trading2.js";
import {NSObject} from "./baseScript.js";
import validMath from "./validMath.js";

export default class Contract extends NSObject {
  constructor(file, server) {
    super(server.ns);
    this.file = file;
    this.server = server;
  }

  get cc() {
    return this.ns.codingcontract;
  }

  get type() {
    return this.cc.getContractType(this.file, this.server.name);
  }

  get description() {
    return this.cc.getDescription(this.file, this.server.name);
  }

  get data() {
    return this.cc.getData(this.file, this.server.name);
  }

  get triesLeft() {
    return this.cc.getNumTriesRemaining(this.file, this.server.name);
  }

  attempt(answer) {
    let reward = this.cc.attempt(answer, this.file, this.server.name, {
      returnReward: true,
    });

    if (reward !== "") return reward;
    return false;
  }

  async solve(submit) {
    let solver = DISPATCH[this.type];
    if (!solver) {
      this.tlog(`No solver for ${this.type}`);
      return;
    }

    let solution = await solver(this.data, this.ns);
    this.tlog(`Solution: ${JSON.stringify(solution)}`);

    if (submit) {
      let success = this.attempt(solution);
      if (success) {
        this.tlog(`SUCCSSFULLY SOLVED! Reward: ${success}`);
      } else {
        this.tlog("FAILED! Tries left: ${this.triesLeft}");
      }
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

  return factors[factors.length - 1];
}

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

  let openCount = 1;
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

let DISPATCH = {
  "Subarray with Maximum Sum": maxSum,
  "Unique Paths in a Grid I": gridPathNoObstacles,
  "Find Largest Prime Factor": largestFactor,
  "Algorithmic Stock Trader III": trading3,
  "Algorithmic Stock Trader I": trading1,
  "Total Ways to Sum": countSums,
  "Merge Overlapping Intervals": mergeIntervals,
  "Generate IP Addresses": generateIps,
  "Spiralize Matrix": spiralize,
  "Find All Valid Math Expressions": validMath,
  "Array Jumping Game": jumps,
};

export {DISPATCH};
