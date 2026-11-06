// How a modifier is written everywhere in the app.

// Always with its sign: +3, -1, +0. Anything that is not a number reads as 0.
export function signed(value) {
  const n = Number(value) || 0;
  return n >= 0 ? `+${n}` : `${n}`;
}

// A dice formula with a flat modifier: 2d8+3, 1d10-1, and just 2d8 when the
// modifier is 0.
export function withModifier(dice, modifier) {
  const n = Number(modifier) || 0;
  return n ? `${dice}${signed(n)}` : `${dice}`;
}
