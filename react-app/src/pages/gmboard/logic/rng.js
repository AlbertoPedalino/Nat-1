export function rollDie(sides, rng = Math.random) {
  return Math.floor(rng() * sides) + 1;
}

export function rollD8D12(rng = Math.random) {
  const d8 = rollDie(8, rng);
  const d12 = rollDie(12, rng);
  return { d8, d12, sum: d8 + d12 };
}

export function rollD20D20(rng = Math.random) {
  const d1 = rollDie(20, rng);
  const d2 = rollDie(20, rng);
  return { d1, d2, sum: d1 + d2 };
}
