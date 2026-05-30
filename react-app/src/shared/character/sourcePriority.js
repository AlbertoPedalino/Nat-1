export const CORE_2024_SOURCE = 'XPHB';

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
export const CORE_2024_SOURCE_PRIORITY = frozenList(['XPHB', 'XDMG', 'EFA', 'FRAiF', 'FRHoF']);

// Content available across all 2024 manuals → membership derived from the
// master set. (These feed isAllowedSource; order is irrelevant for them.)
export const ITEM_SOURCE_PRIORITY = CORE_2024_SOURCE_PRIORITY;
export const SPECIES_ALLOWED_SOURCES = CORE_2024_SOURCE_PRIORITY;
export const SUBCLASS_ALLOWED_SOURCES = CORE_2024_SOURCE_PRIORITY;
export const BACKGROUND_ALLOWED_SOURCES = CORE_2024_SOURCE_PRIORITY;
export const FEAT_ALLOWED_SOURCES = CORE_2024_SOURCE_PRIORITY;
export const OPTIONAL_FEATURE_ALLOWED_SOURCES = CORE_2024_SOURCE_PRIORITY;
export const INVENTORY_SOURCE_PRIORITY = frozenList([...CORE_2024_SOURCE_PRIORITY, 'Custom']);

// Classes ship only in the 2024 core PHB and Eberron — kept deliberately narrow.
export const CLASS_ALLOWED_SOURCES = frozenList(['XPHB', 'EFA']);

// Order-sensitive dedup priorities (a source appearing in several books): the
// ordering is intentional and independent of the membership lists above.
export const SPELL_SOURCE_PRIORITY = frozenList(['XPHB', 'FRAiF', 'FRHoF', 'EFA', 'XDMG']);
export const SUBCLASS_SOURCE_PRIORITY = frozenList(['XPHB', 'FRAiF', 'FRHoF', 'EFA']);

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
