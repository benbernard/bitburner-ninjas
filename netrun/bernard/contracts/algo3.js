// import trading2 from "../trading2.js";

function pairs(set) {
  let pairs = [];
  for (let i = 0; i < set.length; i++) {
    for (let j = i + 1; j < set.length; j++) {
      if (i !== j) {
        pairs.push([i, j]);
      }
    }
  }
  return pairs;
}

function mappedPairs(set) {
  return pairs(set).map(([i, j]) => [set[i], set[j]]);
}

function trading2(data) {
  let trades = pairs(data)
    .map(([i, j]) => {
      return {profit: data[j] - data[i], start: i, end: j};
    })
    .filter(trade => trade.profit > 0);

  let validPairs = mappedPairs(trades).filter(([a, b]) => {
    if (
      a.end < b.start ||
      b.end < a.start ||
      b.end === a.start ||
      b.start === a.end
    ) {
      return true;
    }
    return false;
  });

  let possibleTradePlans = [...trades.map(trade => [trade]), ...validPairs];
  let maxProfit = 0;
  for (let tradeSet of possibleTradePlans) {
    let profit = tradeSet.reduce((acc, trade) => acc + trade.profit, 0);
    if (maxProfit < profit) maxProfit = profit;
  }

  return maxProfit;
}

console.log(trading2([112, 44, 57, 164, 129, 5, 122], 2));
// console.log(positiveTrades([112, 44, 57, 164, 129, 5, 122], 5));
