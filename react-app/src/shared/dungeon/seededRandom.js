// A random sequence that is the same every time it is asked for.
//
// Which is what the dungeon needs and Math.random cannot give it: the panel
// shows the creatures a room's budget buys, and the button places them. Drawn
// afresh on every render those were two different answers, and the map filled
// up with monsters nobody had been shown. Seeded from the roll itself, the same
// key always buys the same creatures — and rolling the rooms again, which is
// the one action that should change them, does.

// mulberry32: small, fast, and good enough for choosing goblins. Not for
// anything that has to be unguessable, which nothing here is.
export function seededRandom(seed) {
  let state = hash(String(seed));
  return function next() {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// FNV-1a, so that two seeds differing by one character do not start next to
// each other: room 1 and room 2 of the same dungeon must not draw the same
// monsters for having nearly the same name.
function hash(text) {
  let value = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    value ^= text.charCodeAt(i);
    value = Math.imul(value, 0x01000193);
  }
  return value >>> 0;
}
