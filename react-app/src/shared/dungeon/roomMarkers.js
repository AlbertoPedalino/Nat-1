import { numberOr } from '../numbers.js';
import { hasTableValue, isNothingFound } from '../gmboard/tables.js';
// The things in a room that are not creatures: what was rolled as a trap, a
// hazard or a hoard, as a marker the GM can see on the board.
//
// A label rather than a note nobody opens: a pit for 2d6 with a DC of 13 is
// three numbers the GM needs at the moment the party walks in, and a marker
// that only says "trap" sends them back to the panel to look them up.

// Told apart at a glance on a board that is otherwise creatures.
export const MARKER_COLORS = Object.freeze({
  trap: '#c04040',
  hazard: '#d69245',
  loot: '#e8a030',
});

// game-icons.net drawings (game:<name>), which the map's object layer draws
// by: the board's other objects are drawn in the same hand.
export const TRAP_ICONS = Object.freeze({
  default: 'game:wolf-trap',
  pit: 'game:spiky-pit',
  dart: 'game:dart',
  blade: 'game:spinning-blades',
  fire: 'game:flame',
  poison: 'game:poison',
  gas: 'game:poison-gas',
  alarm: 'game:ringing-bell',
  magic: 'game:rune-stone',
  crush: 'game:falling-boulder',
  water: 'game:big-wave',
  cold: 'game:snowflake1',
  lightning: 'game:lightning-arc',
});
export const HAZARD_ICON = 'game:hazard-sign';
export const LOOT_ICON = 'game:open-treasure-chest';

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

// Everything the GM needs while the party is standing on it. A trap has one
// DC, and the label says what it is for: finding the trap and disarming it.
export function trapLabel(trap) {
  const dc = numberOr(trap?.dc, null);
  const level = numberOr(trap?.lv, null);
  return [
    String(trap?.type || 'Trap'),
    level != null ? `Level ${level}` : null,
    dc != null ? `DC ${dc} (detect & disarm)` : null,
    trap?.damage ? String(trap.damage) : null,
  ].filter(Boolean).join(' · ');
}

export function lootLabel(loot, lootDc) {
  const rarity = hasTableValue(loot?.rarity) ? String(loot.rarity) : null;
  const dc = numberOr(lootDc?.sum, null);
  return [
    String(loot?.type || 'Loot'),
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
        iconKey: trapIconFor(extra.data.type),
        label: trapLabel(extra.data),
      });
    } else if (extra?.kind === 'env' && extra.data) {
      markers.push({
        kind: 'hazard',
        iconKey: HAZARD_ICON,
        label: [slot.type, extra.data.severity].filter(Boolean).join(' · '),
      });
    }
  }

  const loot = keyRoom.loot?.data;
  if (!isNothingFound(loot)) {
    markers.push({
      kind: 'loot',
      iconKey: LOOT_ICON,
      label: lootLabel(loot, keyRoom.lootDc),
    });
  }

  return markers;
}
