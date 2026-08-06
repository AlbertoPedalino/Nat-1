// The things in a room that are not creatures: what was rolled as a trap, a
// hazard or a hoard, as a marker the GM can see on the board.
//
// A label rather than a note nobody opens: a pit for 2d6 with a DC of 13 is
// three numbers the GM needs at the moment the party walks in, and a marker
// that only says "trap" sends them back to the panel to look them up.

const numberOr = (value, fallback = null) => (Number.isFinite(Number(value)) ? Number(value) : fallback);

// Lucide's own names, which is what the map's object layer draws by.
const TRAP_ICONS = Object.freeze({
  default: 'triangle-alert',
  pit: 'chevrons-down',
  dart: 'move-right',
  blade: 'swords',
  fire: 'flame',
  poison: 'skull',
  gas: 'wind',
  alarm: 'bell-ring',
  magic: 'sparkles',
  crush: 'hammer',
  water: 'droplets',
  cold: 'snowflake',
  lightning: 'zap',
});

// Matched on the words a table actually uses, in either of the two languages
// these tables are written in, and never on the whole string: "Poisoned darts"
// is a poison trap and a dart trap, and either icon says more than a triangle.
const TRAP_WORDS = Object.freeze([
  [/pit|fossa|botola/i, 'pit'],
  [/dart|freccia|arrow|bolt|dardo/i, 'dart'],
  [/blade|scythe|lama|spike|spuntone/i, 'blade'],
  [/fire|flame|fuoco|fiamm/i, 'fire'],
  [/poison|venen|veleno|toxic/i, 'poison'],
  [/gas|fume|vapor|cloud/i, 'gas'],
  [/alarm|allarme|bell/i, 'alarm'],
  [/rune|glyph|magic|arcan|magi/i, 'magic'],
  [/crush|ceiling|boulder|masso|soffitto/i, 'crush'],
  [/water|flood|acqua|drown/i, 'water'],
  [/cold|ice|frost|ghiacc|gelo/i, 'cold'],
  [/lightning|shock|fulmin|elettr/i, 'lightning'],
]);

export function trapIconFor(name) {
  const text = String(name || '');
  for (const [pattern, icon] of TRAP_WORDS) {
    if (pattern.test(text)) return TRAP_ICONS[icon];
  }
  return TRAP_ICONS.default;
}

// Everything the GM needs while the party is standing on it.
export function trapLabel(trap) {
  const dc = numberOr(trap?.dc);
  return [
    String(trap?.tipo || 'Trap'),
    dc != null ? `DC ${dc}` : null,
    trap?.danno ? String(trap.danno) : null,
  ].filter(Boolean).join(' · ');
}

export function lootLabel(loot, lootDc) {
  const rarity = loot?.rarita && loot.rarita !== '—' ? String(loot.rarita) : null;
  const dc = numberOr(lootDc?.sum);
  return [
    String(loot?.tipo || 'Loot'),
    rarity,
    dc != null ? `DC ${dc}` : null,
  ].filter(Boolean).join(' · ');
}

// What a rolled room puts on the map besides its creatures. Hazards get their
// own icon too — an "Environment" slot is a thing in the room, not a mood.
export function roomMarkers(keyRoom) {
  if (!keyRoom) return [];
  const markers = [];

  for (const slot of keyRoom.slots || []) {
    const extra = slot.extra;
    if (extra?.kind === 'trap' && extra.data) {
      markers.push({
        kind: 'trap',
        iconKey: trapIconFor(extra.data.tipo),
        label: trapLabel(extra.data),
      });
    } else if (extra?.kind === 'env' && extra.data) {
      markers.push({
        kind: 'hazard',
        iconKey: 'cloud-lightning',
        label: [slot.type, extra.data.gravita].filter(Boolean).join(' · '),
      });
    }
  }

  const loot = keyRoom.loot?.data;
  if (loot?.tipo && loot.tipo !== 'Nothing found') {
    markers.push({
      kind: 'loot',
      iconKey: 'gem',
      label: lootLabel(loot, keyRoom.lootDc),
    });
  }

  return markers;
}
