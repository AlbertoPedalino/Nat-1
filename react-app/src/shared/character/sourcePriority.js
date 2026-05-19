export const CORE_2024_SOURCE = 'XPHB';

function frozenList(values) {
  return Object.freeze(values.slice());
}

/**
 * Lower index = higher priority. Unknown sources rank after listed sources.
 */
export const SPELL_SOURCE_PRIORITY = frozenList(['XPHB', 'FRAiF', 'FRHoF', 'EFA', 'XDMG']);
export const ITEM_SOURCE_PRIORITY = frozenList(['XPHB', 'XDMG', 'EFA', 'FRAiF', 'FRHoF']);
export const INVENTORY_SOURCE_PRIORITY = frozenList([...ITEM_SOURCE_PRIORITY, 'Custom']);

export const CLASS_ALLOWED_SOURCES = frozenList(['XPHB', 'EFA']);
export const SPECIES_ALLOWED_SOURCES = frozenList(['XPHB', 'EFA', 'FRAiF', 'FRHoF']);
export const SUBCLASS_ALLOWED_SOURCES = frozenList(['XPHB', 'FRAiF', 'FRHoF', 'EFA']);
export const SUBCLASS_SOURCE_PRIORITY = frozenList(['XPHB', 'FRAiF', 'FRHoF', 'EFA']);
export const BACKGROUND_ALLOWED_SOURCES = frozenList(['XPHB', 'EFA', 'FRAiF', 'FRHoF']);
export const FEAT_ALLOWED_SOURCES = frozenList(['XPHB', 'EFA', 'FRAiF', 'FRHoF']);

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
