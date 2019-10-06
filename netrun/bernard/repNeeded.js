let mult = 1.02;
let maxLevel = 151;
let base = 500;
let total = 0;

for (let i = 0; i < maxLevel; i++) {
  total += base;
  console.log(`Level ${i + 1} costs ${base}, total: ${total}`);
  base *= 1.02;
}
