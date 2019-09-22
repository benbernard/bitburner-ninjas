function solverWaysToSum(arrayData) {
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

console.log(solverWaysToSum(parseInt(process.argv[2])));
