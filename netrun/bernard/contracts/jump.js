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

console.log(
  jumps([2, 10, 8, 0, 2, 8, 0, 0, 8, 6, 3, 0, 7, 6, 9, 4, 9, 10, 5, 0, 3, 3, 0])
);
