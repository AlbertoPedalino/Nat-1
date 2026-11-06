// Reading numbers and keeping them inside a range, the same way everywhere.

// `value` as a number, or `fallback` when it does not read as a finite one.
export function numberOr(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

// `value` held between `min` and `max`. A range whose max fell below its min
// (a container smaller than the minimum size) gives min, never a value past it.
export function clamp(value, min, max) {
  return Math.max(min, Math.min(Math.max(min, max), value));
}

// A whole number in range: rounded, then clamped. Anything that does not read
// as a number gives `fallback` (min unless said otherwise).
export function clampInt(value, min, max, fallback = min) {
  const n = Math.round(Number(value));
  return Number.isFinite(n) ? clamp(n, min, max) : fallback;
}
