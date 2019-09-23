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
      return new Trade(data[i], data[j], i, j);
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

class Trade {
  constructor(buy, sell, start, end) {
    this.buy = buy;
    this.sell = sell;
    this.start = start;
    this.end = end;
  }

  get profit() {
    return this.sell - this.buy;
  }

  overlaps(other) {
    if (other.end <= this.start) return false;
    if (other.start >= this.end) return false;
    return true;
  }

  info() {
    return `{s: ${this.start}, e: ${this.end}, p: ${this.profit}}`;
  }
}

// Cheated, I had an implementation but the running time was much too large
export function trading4(data) {
  let i, j, k;

  let tempStr = "[0";
  for (i = 0; i < data[1].length; i++) {
    tempStr += ",0";
  }
  tempStr += "]";
  let tempArr = "[" + tempStr;
  for (i = 0; i < data[0] - 1; i++) {
    tempArr += "," + tempStr;
  }
  tempArr += "]";

  let highestProfit = JSON.parse(tempArr);

  for (i = 0; i < data[0]; i++) {
    for (j = 0; j < data[1].length; j++) {
      // Buy / Start
      for (k = j; k < data[1].length; k++) {
        // Sell / End
        if (i > 0 && j > 0 && k > 0) {
          highestProfit[i][k] = Math.max(
            highestProfit[i][k],
            highestProfit[i - 1][k],
            highestProfit[i][k - 1],
            highestProfit[i - 1][j - 1] + data[1][k] - data[1][j]
          );
        } else if (i > 0 && j > 0) {
          highestProfit[i][k] = Math.max(
            highestProfit[i][k],
            highestProfit[i - 1][k],
            highestProfit[i - 1][j - 1] + data[1][k] - data[1][j]
          );
        } else if (i > 0 && k > 0) {
          highestProfit[i][k] = Math.max(
            highestProfit[i][k],
            highestProfit[i - 1][k],
            highestProfit[i][k - 1],
            data[1][k] - data[1][j]
          );
        } else if (j > 0 && k > 0) {
          highestProfit[i][k] = Math.max(
            highestProfit[i][k],
            highestProfit[i][k - 1],
            data[1][k] - data[1][j]
          );
        } else {
          highestProfit[i][k] = Math.max(
            highestProfit[i][k],
            data[1][k] - data[1][j]
          );
        }
      }
    }
  }
  return highestProfit[data[0] - 1][data[1].length - 1];
}

// export function trading4([numTrades, data]) {
//   if (numTrades > data.length / 2) return trading2(data);
//
//   let baseTrades = allTrades(data);
//   // console.log(`Got trades: ${baseTrades.map(t => t.info()).join("\n")}`);
//
//   let tradeSets = [...baseTrades.map(ts => [ts])];
//
//   for (let i = 1; i < numTrades; i++) {
//     // console.log(
//     //   `Got sets: ${JSON.stringify(
//     //     tradeSets.map(ts => ts.map(t => t.info()))
//     //   )} at numTrades: ${i}`
//     // );
//
//     for (let curTrade of baseTrades) {
//       for (let tradeSet of tradeSets) {
//         let lastTradeInSet = tradeSet[tradeSet.length - 1];
//         if (curTrade.start >= lastTradeInSet.end) {
//           tradeSets.push([...tradeSet, curTrade]);
//         }
//       }
//     }
//   }
//
//   let tradeSetProfit = tradeSet =>
//     tradeSet.reduce((sum, trade) => sum + trade.profit, 0);
//
//   let sortedSets = tradeSets.sort(
//     (a, b) => tradeSetProfit(b) - tradeSetProfit(a)
//   );
//
//   return tradeSetProfit(sortedSets[0]);
// }

export function trading2(data) {
  let prevPrice = data[0];
  let profit = 0;
  for (let price of data.slice(1)) {
    if (price > prevPrice) {
      profit += price - prevPrice;
    }

    prevPrice = price;
  }
  return profit;
}
