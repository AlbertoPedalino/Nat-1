import {
  CORE_2024_SOURCE,
  SUBCLASS_ALLOWED_SOURCES,
  SUBCLASS_SOURCE_PRIORITY,
  compareBySourcePriority,
  isAllowedSource,
  isSupportedEdition,
  normalizeSource,
} from './sourcePriority.js';

function normKey(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

export { normalizeSource };

export function isSupported2024Source(source, edition) {
  return normalizeSource(source) === CORE_2024_SOURCE && isSupportedEdition(edition);
}

export function isSupportedSubclassSource(source, edition) {
  return isAllowedSource(source, SUBCLASS_ALLOWED_SOURCES) && isSupportedEdition(edition);
}

export function isSupportedSubclassRecord(subclass) {
  return isSupportedSubclassSource(subclass?.source, subclass?.edition);
}

export function isSupportedSubclassFeature(feature, supportedSubclasses = []) {
  if (!feature || typeof feature !== 'object') return false;
  const featureClass = normKey(feature.className);
  const featureShort = normKey(feature.subclassShortName || feature.shortName || feature.name);
  const featureSource = normalizeSource(feature.subclassSource || feature.source);
  if (!featureClass || !featureShort) return false;

  return (supportedSubclasses || []).some((subclass) => {
    if (featureClass !== normKey(subclass?.className)) return false;
    if (featureShort !== normKey(subclass?.shortName || subclass?.name)) return false;
    if (featureSource && featureSource !== normalizeSource(subclass?.source)) return false;
    return true;
  });
}

export function compareSourcePriority(a, b) {
  return compareBySourcePriority(a, b, SUBCLASS_SOURCE_PRIORITY);
}
