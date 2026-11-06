// Keeping a number inside a range, the same way everywhere.

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
