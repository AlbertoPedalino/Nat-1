// The throw behind a rolled die: which numbers sit on its other faces, and how
// it tumbles before it settles.
//
// Everything here is derived from a seed rather than from `Math.random()`: a
// die must not re-tumble or change its neighbouring faces when React re-renders
// the toast, and two people watching the same shared roll must see the same
// throw.
//
// `faceValues` dresses a number that `rollFormula`/`rollD20` already decided
// and changes no outcome. `faceNumbering` is different: it numbers a die that
// is about to be thrown on the battle map, where the face left on top is the
// result, so which number sits on which face is part of the roll.

// FNV-1a. Small, no dependencies, and stable across machines — which matters,
// because the map and the sheet both derive the same throw from the same id.
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
export function seededRandom(seed) {
  let state = (hashSeed(seed) + 0x6d2b79f5) >>> 0;
  return function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// The numbers painted on a die. The face that lands towards the viewer carries
// the value that was actually rolled; the rest are only there so the thing
// reads as a die while it is spinning, and are kept distinct from each other
// where the die has faces to spare.
export function faceValues(faceCount, value, sides, seed, landing = 0) {
  const total = Math.max(1, Math.floor(Number(faceCount) || 1));
  const range = Math.max(1, Math.floor(Number(sides) || total));
  const rolled = Number(value);
  const result = Number.isFinite(rolled) ? rolled : 1;
  const next = seededRandom(`${seed}:${result}:${range}`);

  const values = new Array(total);
  const used = new Set([result]);
  for (let index = 0; index < total; index += 1) {
    if (index === landing) {
      values[index] = result;
      continue;
    }
    let candidate = 1 + Math.floor(next() * range);
    let guard = 0;
    // A d4 drawn on a solid with more faces than it has numbers has to repeat.
    while (used.has(candidate) && used.size < range && guard < 40) {
      candidate = 1 + Math.floor(next() * range);
      guard += 1;
    }
    used.add(candidate);
    values[index] = candidate;
  }
  return values;
}

// The numbers painted around a solid, one per face, as a real die is numbered:
// every result appears evenly. Which one comes up is then the throw's business,
// not a separate random result.
//
// A die with more faces on its solid than numbers of its own repeats them.
export function faceNumbering(faceCount, sides, seed) {
  const total = Math.max(1, Math.floor(Number(faceCount) || 1));
  const range = Math.max(1, Math.floor(Number(sides) || total));
  const next = seededRandom(`${seed}:numbering`);

  const numbers = [];
  const completeSets = Math.floor(total / range);
  for (let set = 0; set < completeSets; set += 1) {
    for (let value = 1; value <= range; value += 1) numbers.push(value);
  }

  // A d3 drawn on four faces, for example, must duplicate one value. Rotate
  // which value gets the extra face from throw to throw instead of always
  // duplicating 1; every requested result then has the same long-run chance.
  const remainder = total - numbers.length;
  const extras = Array.from({ length: range }, (_, index) => index + 1);
  shuffle(extras, next);
  numbers.push(...extras.slice(0, remainder));

  shuffle(numbers, next);
  return numbers;
}

function shuffle(values, next) {
  for (let index = values.length - 1; index > 0; index -= 1) {
    const other = Math.floor(next() * (index + 1));
    const held = values[index];
    values[index] = values[other];
    values[other] = held;
  }
}

// What a face says. Numbers, everywhere except a coin: a coin that came up 1
// has not come up one, it has come up heads, and the arithmetic behind it is
// nobody's business but the total's.
const COIN_FACES = { 1: 'Heads', 2: 'Tails' };

export function faceLabel(shape, value) {
  if (shape === 2) return COIN_FACES[value] || String(value ?? '');
  return String(value ?? '');
}

// How far the die travels before landing: whole turns, so it always comes to
// rest with the rolled face towards the viewer, plus a lean that makes two dice
// thrown together look thrown rather than cloned.
export function tumbleTurns(seed) {
  const next = seededRandom(`${seed}:tumble`);
  return {
    x: (1 + Math.floor(next() * 3)) * 360 + Math.round(next() * 40) - 20,
    y: (1 + Math.floor(next() * 3)) * 360 + Math.round(next() * 40) - 20,
    // Staggered so a handful of dice land one after another, like a real throw.
    delayMs: Math.round(next() * 160),
  };
}
