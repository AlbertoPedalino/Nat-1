// Turning an encounter's combatants into map pieces.
//
// The two tools store data very differently — encounters are local-first blobs,
// scenes are cloud rows — so this is a translation and not a shared model. It
// lives here, pure, because the mapping is where the judgement calls are.

import { getHP, getMonsterTokenUrls } from '../../pages/encounterbuilder/logic/monsterUtils.js';
import { makeSourceRef } from './encounterSync.js';

// D&D creature sizes in squares. A Large creature is the first that stops
// fitting in one, and Tiny still gets a whole square: two goblins sharing a
// cell is a rules argument, not a rendering one.
const SIZE_SPANS = { T: 1, S: 1, M: 1, L: 2, H: 3, G: 4 };

// Distinct enough to tell apart at token size, and stable per name so the same
// creature keeps its colour across imports.
const PALETTE = ['#b3423a', '#7a5aa8', '#3f7a55', '#a8762f', '#3d6a94', '#8d4a70'];

// A snapshotted combatant keeps `monsterRef` — the name and source — even when
// the stat block itself was not re-linked. Art only needs those two, so the
// picture survives an import made without the bestiary loaded; only the size
// falls back to one square.
function artworkSource(combatant) {
  return combatant?.monsterData || combatant?.monsterRef || null;
}

function sizeKey(monster) {
  const value = Array.isArray(monster?.size) ? monster.size[0] : monster?.size;
  return typeof value === 'string' ? value.toUpperCase().slice(0, 1) : '';
}

export function monsterSpan(monster) {
  return SIZE_SPANS[sizeKey(monster)] || 1;
}

export function colorForName(name) {
  const text = String(name || '');
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) % 100000;
  }
  return PALETTE[hash % PALETTE.length];
}

// Combatants already carry a per-name letter (Goblin A, Goblin B) from the
// encounter builder; keeping it is what makes a token recognisable at the table.
export function combatantLabel(combatant) {
  const name = combatant?.name || 'Creature';
  return combatant?.label ? `${name} ${combatant.label}` : name;
}

// Players are already on the map as their own character pieces, and a monster
// must never be movable by them, so only monsters come across and none of them
// gets a character_id.
export function importableCombatants(combat) {
  return (combat?.combatants || []).filter((combatant) => (
    combatant && combatant.type !== 'player' && !combatant.isDead
  ));
}

export function combatantToToken(combatant, { layer = 'tokens', instanceId, fightId } = {}) {
  const span = monsterSpan(combatant?.monsterData);
  const [artwork] = getMonsterTokenUrls(artworkSource(combatant));
  return {
    layer,
    label: combatantLabel(combatant),
    // The colour is the ring around the art, and the fallback when the bestiary
    // image cannot be fetched.
    color: colorForName(combatant?.name),
    // The real bestiary token, not a coloured circle: recognising a creature at
    // a glance is most of what a piece is for.
    image_url: artwork || null,
    w: span,
    h: span,
    // A monster's hit points belong to the piece — its sheet is the stat block,
    // which has no per-creature state. A player's piece leaves these null and
    // reads the character sheet instead.
    hp_current: numberOrNull(combatant?.hpCurrent),
    hp_max: numberOrNull(combatant?.hpMax),
    // Where it came from, so a browser with both tabs open can keep the two in
    // step. Null when imported outside that context — the piece still works, it
    // just stops hearing about the fight.
    source_ref: makeSourceRef(instanceId, fightId, combatant?.id),
    conditions: Array.isArray(combatant?.activeConditions) ? combatant.activeConditions : [],
  };
}

function numberOrNull(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed) : null;
}

// Straight from the bestiary, with no encounter behind it. Average hit points
// from the stat block rather than a roll: a piece dropped on the map is not a
// combat yet, and the GM can edit the number from its menu.
//
// No source_ref either — there is no fight to keep in step with.
export function monsterToToken(monster, { layer = 'tokens', label } = {}) {
  const span = monsterSpan(monster);
  const [artwork] = getMonsterTokenUrls(monster);
  const hp = numberOrNull(getHP(monster?.hp));
  return {
    layer,
    label: label || monster?.name || 'Creature',
    color: colorForName(monster?.name),
    image_url: artwork || null,
    w: span,
    h: span,
    hp_current: hp,
    hp_max: hp,
    conditions: [],
  };
}

// Several copies of the same creature get the letters the encounter builder
// would have given them, because "Goblin" three times over is unusable.
export function monsterGroupTokens(monster, count, options = {}) {
  const total = Math.max(1, Math.min(24, Math.round(Number(count) || 1)));
  const name = monster?.name || 'Creature';
  return Array.from({ length: total }, (_, index) => monsterToToken(monster, {
    ...options,
    label: total > 1 ? `${name} ${String.fromCharCode(65 + (index % 26))}` : name,
  }));
}

// Lay the imported pieces out in a block, skipping squares that are taken. A
// creature wider than one cell reserves all of them, or a 2x2 ogre would be
// dropped on top of the goblin next to it.
export function layoutTokens(tokens, occupied = [], { columns = 6, origin = { x: 0, y: 0 } } = {}) {
  const taken = new Set(occupied.map((token) => `${Math.round(token.x)}:${Math.round(token.y)}`));
  const placed = [];
  let cursor = 0;

  for (const token of tokens) {
    let position = null;
    // Bounded so a pathological grid cannot spin here forever.
    for (let attempt = 0; attempt < 400 && !position; attempt += 1) {
      const col = origin.x + (cursor % columns);
      const row = origin.y + Math.floor(cursor / columns);
      cursor += 1;
      const cells = [];
      for (let dy = 0; dy < token.h; dy += 1) {
        for (let dx = 0; dx < token.w; dx += 1) cells.push(`${col + dx}:${row + dy}`);
      }
      if (cells.every((cell) => !taken.has(cell))) {
        cells.forEach((cell) => taken.add(cell));
        position = { x: col, y: row };
      }
    }
    placed.push({ ...token, ...(position || { x: origin.x, y: origin.y }) });
  }

  return placed;
}
