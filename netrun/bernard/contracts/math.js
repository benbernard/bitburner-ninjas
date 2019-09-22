// let numbers = "218314663";
// let numbers = "218";
// let target = -45;

// let [numbers, target] = ["105", 5];
let [numbers, target] = ["218314663", -45];

const operators = ["+", "-", "*"];

class Node {
  constructor(val, op, prev) {
    this.val = parseInt(val);
    this.prev = prev;
    this.children = [];
    this.op = op;
  }

  isOperator() {
    return operators.indexOf(this.val) !== -1;
  }

  addChild(node) {
    this.children.push(node);
  }

  isRoot() {
    return this.prev === null;
  }

  setChildren(children) {
    this.children = children;
  }

  fullString() {
    return `${this.isRoot() ? "" : this.prev.fullString()}${this.op}${
      this.val
    }`;
  }

  execute() {
    // if (this.isRoot()) return this.val;
    //
    // if (this.op === "+") {
    //   return this.prev.execute() + this.val;
    // } else if (this.op === "-") {
    //   return this.prev.execute() - this.val;
    // } else if (this.op === "*") {
    //   return this.prev.execute() * this.val;
    // } else {
    //   throw new Error(`Unrecognized op: ${this.op}`);
    // }
    let expr = this.fullString();
    return eval(expr); // eslint-disable-line no-eval
  }
}

let currentNodes = [
  new Node(numbers[0], "", null),
  // new Node(-numbers[0], "", null),
];

for (let char of numbers.slice(1)) {
  let newNodes = [];
  for (let node of currentNodes) {
    let children = [
      new Node(char, "+", node),
      new Node(char, "-", node),
      new Node(char, "*", node),
    ];

    if (node.val !== 0) {
      let newVal = "" + node.val + char;
      children.push(new Node(newVal, node.op, node.prev));
    }

    newNodes = newNodes.concat(children);
  }

  currentNodes = newNodes;
}

// console.log(
//   currentNodes.map(node => `${node.fullString()}=${node.execute()}`).join("\n")
// );

let results = currentNodes.filter(node => node.execute() === target);

console.log(results.map(e => `${e.fullString()}`).join(","));
