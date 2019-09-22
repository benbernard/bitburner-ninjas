const operators = ["+", "-", "*"];

class Node {
  constructor(val, op, parent) {
    this.val = parseInt(val);
    this.parent = parent;
    this.op = op;
  }

  isOperator() {
    return operators.indexOf(this.val) !== -1;
  }

  addChild(node) {
    if (!this.children) this.children = [];
    this.children.push(node);
  }

  isRoot() {
    return this.parent == null;
  }

  setChildren(children) {
    this.children = children;
  }

  fullString() {
    return `${this.isRoot() ? "" : this.parent.fullString()}${this.op}${
      this.val
    }`;
  }

  // execute() {
  //   let expr = this.fullString();
  //   return eval(expr); // eslint-disable-line no-eval
  // }

  // execute() {
  //   switch(this.op) {
  //     case: "+":
  //     case: "-":
  //     case: "*":
  //   }
  // }

  makeChild(op, char) {
    let node;
    switch (op) {
      case "+":
        return new Node(char, "+", this);
      case "-":
        return new Node(char, "-", this);
      case "*":
        return new Node(char, "*", this);
      case "":
        return new Node(this.val + "" + char, this.op, this.parent);
    }
  }

  execute() {
    if (this.computedValue) return this.computedValue;

    this.computedValue = this.baseCompute(this.val);
    return this.computedValue;
  }

  baseCompute(val) {
    if (this.isRoot()) return this.val;

    switch (this.op) {
      case "+":
        return this.parent.execute() + val;
      case "-":
        return this.parent.execute() - val;
      case "*":
        if (this.parent.isRoot()) {
          return this.parent.val * val;
        } else {
          return this.parent.baseCompute(this.parent.val * val);
        }
    }
  }
}

export default function validMath([numbers, target]) {
  let currentNodes = [new Node(numbers[0], "", null)];

  for (let char of numbers.slice(1)) {
    let newNodes = [];
    for (let node of currentNodes) {
      newNodes.push(
        node.makeChild("+", char),
        node.makeChild("-", char),
        node.makeChild("*", char)
      );

      if (node.val !== 0) {
        let newVal = "" + node.val + char;
        newNodes.push(node.makeChild("", char));
      }
    }

    currentNodes = newNodes;
  }

  let results = currentNodes.filter(node => node.execute() === target);
  return results.map(e => e.fullString());
}
