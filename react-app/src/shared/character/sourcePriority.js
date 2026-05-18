/**
 * Single canonical priority list for 5e 2024 supported sources.
 * Lower index = higher priority. Sources not in the list rank last.
 */
export const SOURCE_PRIORITY = ['XPHB', 'FRAiF', 'FRHoF', 'EFA', 'XDMG'];

export const SUPPORTED_SOURCES = new Set(SOURCE_PRIORITY);

export const CORE_2024_SOURCE = 'XPHB';

export function normalizeSource(source) {
  return String(source || '').trim();
}

export function sourceRank(source) {
  const idx = SOURCE_PRIORITY.indexOf(normalizeSource(source));
  return idx === -1 ? SOURCE_PRIORITY.length : idx;
}

export function isSupportedSource(source) {
  return SUPPORTED_SOURCES.has(normalizeSource(source));
}

export function isSupportedEdition(edition) {
  if (!edition) return true;
  return String(edition).trim().toLowerCase() === 'one';
}
