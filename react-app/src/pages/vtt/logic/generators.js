// The map generators a scene can be started from.
//
// They are Watabou's Procgen Arcana: browser apps with no API of any kind, so
// nothing here fetches anything. What this module knows is which generator
// answers which question, where it lives, and what to call the scenes that come
// out of it — the pictures themselves arrive as files the GM exports and hands
// back to us, which is the only route a page has to the output of another
// origin's canvas.
//
// Maps from these generators may be used freely, commercially included;
// attribution is appreciated rather than required, and the dialog gives it.

export const GENERATOR_CREDIT = Object.freeze({
  label: "Watabou's Procgen Arcana",
  url: 'https://watabou.github.io/',
});

export const GENERATORS = Object.freeze([
  {
    id: 'dungeon',
    label: 'Dungeon',
    blurb: 'Rooms, corridors and doors on one page.',
    url: 'https://watabou.github.io/one-page-dungeon/',
    floors: false,
  },
  {
    id: 'cave',
    label: 'Cave',
    blurb: 'Caverns and glades, for what was never built.',
    url: 'https://watabou.github.io/cave-generator/',
    floors: false,
  },
  {
    id: 'dwelling',
    label: 'Dwelling',
    blurb: 'Cabins to mansions, up to eight storeys and a cellar.',
    url: 'https://watabou.github.io/dwellings/',
    floors: true,
  },
  {
    id: 'village',
    label: 'Village',
    blurb: 'A hamlet with its fields, roads and mill.',
    url: 'https://watabou.github.io/village-generator/',
    floors: false,
  },
  {
    id: 'city',
    label: 'City',
    blurb: 'Walls, quarters and streets to lose a party in.',
    url: 'https://watabou.github.io/city-generator/',
    floors: false,
  },
  {
    id: 'realm',
    label: 'Realm',
    blurb: 'Coast and country, for the hexcrawl between towns.',
    url: 'https://watabou.github.io/perilous-shores/',
    floors: false,
  },
]);

// Which files are a map, and which is the data beside it. A GM exporting a
// building drops the whole download folder in as often as not.
export function isMapImage(file) {
  const name = String(file?.name || '').toLowerCase();
  return /^image\//.test(file?.type || '') || /\.(png|jpe?g|webp|svg)$/.test(name);
}

// Watabou names its exports after the seed, which is meaningless in a scene
// list, so the name comes from the generator and the file's place in the drop.
// A building is the exception worth handling: several files from a floor-plan
// generator are the storeys of one house, in the order they were exported.
export function sceneNamesFor(generator, files) {
  const count = files?.length || 0;
  if (!count) return [];
  const label = generator?.label || 'Scene';
  if (count === 1) return [label];
  if (generator?.floors) {
    return Array.from({ length: count }, (_, index) => `${label} — Floor ${index + 1}`);
  }
  return Array.from({ length: count }, (_, index) => `${label} ${index + 1}`);
}

// What several files mean. Two floors are sometimes two boards and sometimes
// one board with both on it — the second reads better when the party splits, or
// when the stair is something to point at rather than a scene to switch to.
export function joinedSceneName(generator, count) {
  const label = generator?.label || 'Scene';
  if (!(count > 1)) return label;
  return generator?.floors ? `${label} — ${count} floors` : `${label} — ${count} maps`;
}

// Dropped files arrive in whatever order the picker felt like. A building's
// storeys are numbered in their own names — "…-1.png", "floor 2", "level3" —
// so the numbers decide, and anything without one keeps its place at the end.
export function orderForFloors(files) {
  const list = [...(files || [])];
  return list
    .map((file, index) => {
      const digits = String(file?.name || '').match(/(\d+)(?!.*\d)/);
      return { file, index, floor: digits ? Number(digits[1]) : null };
    })
    .sort((a, b) => {
      if (a.floor == null && b.floor == null) return a.index - b.index;
      if (a.floor == null) return 1;
      if (b.floor == null) return -1;
      return a.floor - b.floor || a.index - b.index;
    })
    .map((entry) => entry.file);
}
