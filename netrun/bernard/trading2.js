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

function allTrades(data) {
  return pairs(data)
    .map(([i, j]) => {
      return {profit: data[j] - data[i], start: i, end: j};
    })
    .filter(trade => trade.profit > 0);
}

function maxProfitOfTradeSets(tradeSets) {
  let maxProfit = 0;

  for (let tradeSet of tradeSets) {
    if (!(tradeSet instanceof Array)) {
      tradeSet = [tradeSet];
    }

    let profit = tradeSet.reduce((acc, trade) => acc + trade.profit, 0);
    if (maxProfit < profit) maxProfit = profit;
  }

  return maxProfit;
}

export function trading1(data) {
  return maxProfitOfTradeSets(allTrades(data));
}

export function trading3(data) {
  let trades = allTrades(data);

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
  return maxProfitOfTradeSets(possibleTradePlans);
}
