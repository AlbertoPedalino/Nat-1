function frozenList(values) {
  return Object.freeze(values.slice());
}

/**
 * Lower index = higher priority. Unknown sources rank after listed sources.
 */
// ── Single source of truth for supported 2024 (5.5e) manuals ──────────────
// ADD A NEW MANUAL HERE (in priority order) and every content whitelist below
// that derives from it picks it up automatically. Whitelisting a book that
// lacks a given content type is harmless — no phantom data appears.
export const CORE_2024_SOURCE_PRIORITY = frozenList([
  'XPHB',
  'XDMG',
  'EFA',
  'FRAiF',
  'FRHoF',
  'RHW',
  'AU',
  'AUD',
  'WoW',
]);

// Content available across all 2024 manuals → membership derived from the
// master set. (These feed isAllowedSource; order is irrelevant for them.)
export const ITEM_SOURCE_PRIORITY = CORE_2024_SOURCE_PRIORITY;
export const SPECIES_ALLOWED_SOURCES = CORE_2024_SOURCE_PRIORITY;
export const SUBCLASS_ALLOWED_SOURCES = CORE_2024_SOURCE_PRIORITY;
export const BACKGROUND_ALLOWED_SOURCES = CORE_2024_SOURCE_PRIORITY;
export const FEAT_ALLOWED_SOURCES = CORE_2024_SOURCE_PRIORITY;
export const OPTIONAL_FEATURE_ALLOWED_SOURCES = CORE_2024_SOURCE_PRIORITY;
export const INVENTORY_SOURCE_PRIORITY = frozenList([...CORE_2024_SOURCE_PRIORITY, 'Custom']);

// Classes ship only in the 2024 core PHB, Eberron and World of Warcraft (its
// class skins) — kept deliberately narrow.
export const CLASS_ALLOWED_SOURCES = frozenList(['XPHB', 'EFA', 'WoW']);

// Wild Shape beast forms. The 2024 Monster Manual (XMM) is the canonical beast
// roster; the supported 2024 manuals add a few beasts of their own. XMM is not in
// CORE_2024_SOURCE_PRIORITY (it's a bestiary, not a player-content book), so it's
// listed explicitly here.
export const BEAST_ALLOWED_SOURCES = frozenList([
  'XMM',
  ...CORE_2024_SOURCE_PRIORITY.filter((source) => source !== 'AU' && source !== 'AUD'),
]);

// Order-sensitive dedup priorities (a source appearing in several books): the
// ordering is intentional and independent of the membership lists above.
export const SPELL_SOURCE_PRIORITY = frozenList(['XPHB', 'FRAiF', 'FRHoF', 'EFA', 'AU', 'XDMG', 'WoW']);
export const SUBCLASS_SOURCE_PRIORITY = frozenList(['XPHB', 'FRAiF', 'FRHoF', 'EFA', 'RHW', 'AU', 'WoW']);

// ── Books a character is built from ───────────────────────────────────────
// The player picks them in the builder; the choice is saved on the character
// (`books`: the selectable books chosen) and the sheet honours it. The core
// books are always on. A character without `books` uses every book.
export const ALWAYS_ON_BOOKS = frozenList(['XPHB', 'XDMG', 'XMM']);
export const SELECTABLE_BOOKS = frozenList(CORE_2024_SOURCE_PRIORITY.filter((source) => !ALWAYS_ON_BOOKS.includes(source)));

// The selectable books a character uses (all of them without a choice).
export function characterBooks(character) {
  return Array.isArray(character?.books)
    ? SELECTABLE_BOOKS.filter((source) => character.books.includes(source))
    : SELECTABLE_BOOKS.slice();
}

// Whether content of `source` is offered to the character: everything except
// a selectable book the character does not use.
export function isBookAllowed(character, source) {
  const book = normalizeSource(source);
  return !SELECTABLE_BOOKS.includes(book) || characterBooks(character).includes(book);
}

export function normalizeSource(source) {
  return String(source || '').trim();
}

export function sourceRank(source, priorityList) {
  const list = Array.isArray(priorityList) ? priorityList : [];
  const idx = list.indexOf(normalizeSource(source));
  return idx === -1 ? list.length : idx;
}

export function isAllowedSource(source, allowedSources) {
  const allowed = Array.isArray(allowedSources) ? allowedSources : [];
  return allowed.includes(normalizeSource(source));
}

export function isSupportedEdition(recordOrEdition) {
  const edition = recordOrEdition && typeof recordOrEdition === 'object'
    ? recordOrEdition.edition
    : recordOrEdition;
  if (!edition) return true;
  return String(edition).trim().toLowerCase() === 'one';
}

export function compareBySourcePriority(a, b, priorityList) {
  const aRecord = a && typeof a === 'object' ? a : { source: a };
  const bRecord = b && typeof b === 'object' ? b : { source: b };
  const rankDiff = sourceRank(aRecord.source, priorityList) - sourceRank(bRecord.source, priorityList);
  if (rankDiff) return rankDiff;
  const aEdition = isSupportedEdition(aRecord) ? 0 : 1;
  const bEdition = isSupportedEdition(bRecord) ? 0 : 1;
  return aEdition - bEdition;
}

// The supported books by name, for a source filter or a credit line.
export const SOURCE_LABELS = Object.freeze({
  XPHB: "Player's Handbook (2024)",
  XMM: 'Monster Manual (2024)',
  XDMG: "Dungeon Master's Guide (2024)",
  FRAiF: 'Forgotten Realms: Adventures in Faerun',
  FRHoF: 'Forgotten Realms: Heroes of Faerun',
  EFA: 'Eberron: Forge of the Artificer',
  RHW: 'Ravenloft: The Horrors Within',
  AU: 'Arcana Unleashed',
  AUD: 'Arcana Unleashed: Deadfall',
  WoW: 'World of Warcraft',
});

export function sourceLabel(source) {
  return SOURCE_LABELS[source] || source;
}
