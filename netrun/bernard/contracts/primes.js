function largestFactor(target) {
  if (target === 1) return target;
  let factors = [];

  for (let i = 2; i <= Math.floor(target / 2); i++) {
    if (target % i === 0) {
      console.log(`found factor: ${i}`);
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

console.log(largestFactor(63945825));
