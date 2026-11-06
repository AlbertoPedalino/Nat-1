import {
  SUBCLASS_ALLOWED_SOURCES,
  SUBCLASS_SOURCE_PRIORITY,
  compareBySourcePriority,
  isAllowedSource,
  isSupportedEdition,
  normalizeSource,
} from './sourcePriority.js';
import { matchKey } from './nameKeys.js';

export { normalizeSource };

export function isSupportedSubclassSource(source, edition) {
  return isAllowedSource(source, SUBCLASS_ALLOWED_SOURCES) && isSupportedEdition(edition);
}

export function isSupportedSubclassRecord(subclass) {
  return isSupportedSubclassSource(subclass?.source, subclass?.edition);
}

export function isSupportedSubclassFeature(feature, supportedSubclasses = []) {
  if (!feature || typeof feature !== 'object') return false;
  const featureClass = matchKey(feature.className);
  const featureShort = matchKey(feature.subclassShortName || feature.shortName || feature.name);
  const featureSource = normalizeSource(feature.subclassSource || feature.source);
  if (!featureClass || !featureShort) return false;

  return (supportedSubclasses || []).some((subclass) => {
    if (featureClass !== matchKey(subclass?.className)) return false;
    if (featureShort !== matchKey(subclass?.shortName || subclass?.name)) return false;
    if (featureSource && featureSource !== normalizeSource(subclass?.source)) return false;
    return true;
  });
}

export function compareSourcePriority(a, b) {
  return compareBySourcePriority(a, b, SUBCLASS_SOURCE_PRIORITY);
}
