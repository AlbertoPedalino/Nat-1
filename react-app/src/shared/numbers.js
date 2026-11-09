// Reading numbers and keeping them inside a range, the same way everywhere.

// `value` as a number, or `fallback` when it does not read as a finite one.
export function numberOr(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

// A stored number, or null when there is none: missing, empty or not a number
// (Number(null) is 0, which is how a missing total once read as a zero).
export function numberOrNull(value) {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
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

// Whether `value` lies within a range typed by hand: `min` and `max` are the
// fields' text ('' leaves that end open, a comma reads as a decimal point).
export function withinTypedRange(value, min, max) {
  const bound = (raw) => {
    const text = String(raw ?? '').trim();
    if (!text) return null;
    const n = Number(text.replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  };
  const low = bound(min);
  const high = bound(max);
  return (low == null || value >= low) && (high == null || value <= high);
}
