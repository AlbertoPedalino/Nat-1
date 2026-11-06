// A random sequence that is the same every time it is asked for: the dungeon's
// suggested creatures (the panel shows what the button places) and the shape
// of a thrown die (the map and the sheet derive the same throw from one id).

// FNV-1a: small, stable across machines, and seeds one character apart do not
// start next to each other.
export function hashSeed(value) {
  let hash = 0x811c9dc5;
  const text = String(value ?? '');
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

// mulberry32: one seed in, a repeatable stream of numbers in [0, 1) out.
// Not for anything that has to be unguessable. `warmup` draws and discards
// that many numbers first: dice throws skip one, so every throw already made
// keeps its shape.
export function seededRandom(seed, { warmup = 0 } = {}) {
  let state = hashSeed(seed);
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = 0; i < warmup; i += 1) next();
  return next;
}
