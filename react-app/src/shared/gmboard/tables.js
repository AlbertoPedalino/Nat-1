// The board's tables: one lookup per table, and what a rolled row means. Every
// generator (hexcrawl, dungeon, quest, the Roll tab) reads a row through here,
// so a type's rules — what it chains into, which DC it asks for — live once.

// A loot row that found nothing, and the "no value" mark its columns carry.
export const NOTHING_FOUND = 'Nothing found';
const NO_VALUE = '—';
// The event row that rolls on the tier Trap Table.
const TRAP_EVENT = 'Env. Damage/Trap';

export function getEvent(tables, sum) {
  return tables.events.find((e) => e.r === sum) || { name: NO_VALUE, type: 'nothing' };
}

export function getLoot(tables, sum) {
  return tables.loot.find((e) => e.r === sum) || { type: NOTHING_FOUND, rarity: NO_VALUE, quality: NO_VALUE, value: NO_VALUE, extra: '' };
}

export function getCompl(tables, sum) {
  return tables.compl.find((e) => e.r === sum) || { type: 'None' };
}

export function getEnc(tables, tier, sum) {
  return (tables.enc[tier - 1] || []).find((e) => e.r === sum) || { diff: 'Low', lv: '?', xp: 0 };
}

export function getTrap(tables, tier, sum) {
  return (tables.trap[tier - 1] || []).find((e) => e.r === sum) || { type: 'Nuisance', lv: '?', dc: 10, damage: '?' };
}

export function getEnvSev(tables, sum) {
  return tables.env.find((e) => e.r === sum) || { severity: 'Common' };
}

// What an event row is: 'encounter', 'loot', 'camp' (an enemy camp: spot it,
// fight it, loot it), 'trap', 'nothing', or 'other' (something to interact
// with). The type column says it, except for the trap, which is known by name.
export function eventKind(ev) {
  if (ev?.type === 'encounter' || ev?.type === 'loot' || ev?.type === 'nothing') return ev.type;
  if (ev?.type === 'camp_nemico') return 'camp';
  if (ev?.name === TRAP_EVENT) return 'trap';
  return 'other';
}

// The tables an event chains into, in order.
const EVENT_FOLLOW_UPS = Object.freeze({
  encounter: ['encounter'], loot: ['loot'], camp: ['encounter', 'loot'], trap: ['trap'],
});
export function eventFollowUps(kind) {
  return EVENT_FOLLOW_UPS[kind] || [];
}

// The check an event asks of the party, rolled with it: a camp to spot,
// something to interact with. A trap's DC is on its own row; encounters, loot
// and nothing ask for none.
export function eventDcLabel(kind) {
  if (kind === 'camp') return 'DC to spot the camp';
  if (kind === 'other') return 'DC to interact';
  return null;
}

export function isNothingFound(loot) {
  return !loot?.type || loot.type === NOTHING_FOUND;
}

// Whether a column holds a value ("—" and empty mean none).
export function hasTableValue(value) {
  return value != null && value !== '' && value !== NO_VALUE;
}
