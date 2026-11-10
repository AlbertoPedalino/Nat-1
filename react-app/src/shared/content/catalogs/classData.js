import { CLASS_FILES } from './catalogFiles.js';
import {
  CLASS_ALLOWED_SOURCES,
  OPTIONAL_FEATURE_ALLOWED_SOURCES,
  isAllowedSource,
} from '../sourcePriority.js';
import {
  compareSourcePriority,
  isSupportedSubclassFeature,
  isSupportedSubclassRecord,
} from '../sourceFiltering.js';
import { loadGameData } from '../gameData.js';
import { stripTemplatedEntries } from './entryTemplates.js';
import { byName } from '../../lists.js';
import { resolveClassData } from './classScope.js';

// Classes, subclasses and their features (`_copy` resolved, class skins with
// their rule class: classScope.js), plus the optional features a class
// chooses from (invocations, fighting styles, metamagic…).

export async function loadClassIndex() {
  const entries = await Promise.allSettled(CLASS_FILES.map((file) => loadGameData(`class/${file}`)));
  const cache = {};
  const allClasses = [];
  const allSubclasses = [];
  const classes = [];
  const subclasses = [];
  const classFeatures = [];
  const subclassFeatures = [];

  entries.forEach((entry, index) => {
    if (entry.status !== 'fulfilled') return;
    const file = CLASS_FILES[index];
    const data = entry.value;
    cache[file] = data;
    allClasses.push(...(data.class || []));
    allSubclasses.push(...(data.subclass || []));
    classes.push(...(data.class || []).filter((cls) => isAllowedSource(cls.source, CLASS_ALLOWED_SOURCES)));
    const allSubs = (data.subclass || []).filter(isSupportedSubclassRecord);
    const subByKey = {};
    allSubs.forEach((sub) => {
      const key = `${sub.className}|${sub.classSource}|${sub.shortName}`;
      const existing = subByKey[key];
      if (!existing) { subByKey[key] = sub; return; }
      if (compareSourcePriority(sub, existing) < 0) subByKey[key] = sub;
    });
    const supportedSubclasses = Object.values(subByKey);
    subclasses.push(...supportedSubclasses);
    classFeatures.push(...(data.classFeature || []).filter((feature) => !feature.isReprinted));
    subclassFeatures.push(...(data.subclassFeature || []).filter((feature) => (
      !feature.isReprinted && isSupportedSubclassFeature(feature, supportedSubclasses)
    )));
  });

  const resolved = resolveClassData({ allClasses, classes, allSubclasses, subclasses, classFeatures, subclassFeatures });
  return {
    cache,
    ...resolved,
    classes: resolved.classes.sort(byName),
  };
}

export async function loadOptionalFeatures() {
  const data = await loadGameData('optionalfeatures.json');
  return (data.optionalfeature || [])
    .filter((f) => isAllowedSource(f.source, OPTIONAL_FEATURE_ALLOWED_SOURCES) && Array.isArray(f.entries))
    .map((f) => ({
      name: f.name,
      source: f.source,
      featureType: f.featureType,
      prerequisite: f.prerequisite || null,
      entries: stripTemplatedEntries(f.entries),
    }));
}
