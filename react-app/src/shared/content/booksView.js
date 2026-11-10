import { characterBooks, isBookAllowed } from './sourcePriority.js';
import { dedupeSpellsBySourcePriority } from '../character/spells/spellNormalization.js';
import { classSpellIndexForBooks } from './catalogs/spellData.js';
import { byName } from '../lists.js';

// The game data as a character sees it: only the books it is built from
// (sourcePriority.js characterBooks). Loaders keep every book's version; the
// pick among a spell's printings happens after the filter, so turning a book
// off brings back the other book's version. Compendium, encounter builder and
// battle map read the loaders unfiltered.

export function filterByBooks(records, character, sourceOf = (record) => record?.source) {
  return (Array.isArray(records) ? records : []).filter((record) => isBookAllowed(character, sourceOf(record)));
}

// The spells a character may pick: each spell once, its best printing among
// the books in use.
export function spellsForBooks(spellVersions, character) {
  return dedupeSpellsBySourcePriority(filterByBooks(spellVersions, character))
    .sort((a, b) => (a.level - b.level) || byName(a, b));
}

// The class spell lists of the books in use (spellData.js classSpellBooks);
// without per-book lists, the full index (the spells are filtered anyway).
export function classSpellIndexForCharacter({ classSpellBooks, classSpellIndex }, character) {
  return classSpellBooks ? classSpellIndexForBooks(classSpellBooks, character) : (classSpellIndex || {});
}

const FILTERED_KEYS = ['classes', 'subclasses', 'species', 'backgrounds', 'feats', 'optionalFeatures', 'items', 'beasts'];
const viewCache = new WeakMap();

// The builder's loaded data (state.data) narrowed to a character's books, one
// object per data load and book choice.
export function builderDataForBooks(data, character) {
  if (!data) return data;
  const key = characterBooks(character).join('|');
  let byBooks = viewCache.get(data);
  if (!byBooks) {
    byBooks = new Map();
    viewCache.set(data, byBooks);
  }
  if (byBooks.has(key)) return byBooks.get(key);
  const view = { ...data };
  FILTERED_KEYS.forEach((field) => {
    if (Array.isArray(data[field])) view[field] = filterByBooks(data[field], character);
  });
  if (Array.isArray(data.spellVersions) && data.spellVersions.length) view.spells = spellsForBooks(data.spellVersions, character);
  view.classSpellIndex = classSpellIndexForCharacter(data, character);
  byBooks.set(key, view);
  return view;
}
