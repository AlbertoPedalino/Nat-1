import { resolveCopyRecords } from '../copyRecords.js';
import { asArray } from '../../lists.js';
import { lowerKey, recordKey, splitNameSource, stripSource } from '../nameKeys.js';

// Classes as the builder and the sheet use them: each with its own features
// and the subclasses it offers, read from the class's `classFeatures` and each
// subclass's `subclassFeatures` references (and the features those entries
// point at), so a World of Warcraft class skin — a record that copies an XPHB
// class (`_copy` + `reskinOf`) and may swap some of its features — gets its
// base class's features and subclasses without a hand-written list.

function refString(ref, field) {
  return typeof ref === 'string' ? ref : ref?.[field] || '';
}

// "Name|Class|ClassSource|Level|Source" (sources default as 5etools does).
function classFeatureRefKey(ref) {
  const [name, className, classSource, level, source] = String(ref).split('|');
  const cs = classSource || 'PHB';
  return [name, className, cs, level, source || cs].map(lowerKey).join('|');
}

function classFeatureKey(feature) {
  return [feature.name, feature.className, feature.classSource, feature.level, feature.source].map(lowerKey).join('|');
}

// "Name|Class|ClassSource|Subclass|SubclassSource|Level|Source".
function subclassFeatureRefKey(ref) {
  const [name, className, classSource, shortName, subclassSource, level, source] = String(ref).split('|');
  const cs = classSource || 'PHB';
  const ss = subclassSource || 'PHB';
  return [name, className, cs, shortName, ss, level, source || ss].map(lowerKey).join('|');
}

function subclassFeatureKey(feature) {
  return [
    feature.name, feature.className, feature.classSource, feature.subclassShortName,
    feature.subclassSource, feature.level, feature.source,
  ].map(lowerKey).join('|');
}

function classKey(record) {
  return recordKey(record?.name, record?.source);
}

function parseClassRef(ref) {
  const { name, source } = splitNameSource(ref);
  return name ? { name, source: source || 'PHB' } : null;
}

function subclassKey(record) {
  return [record?.shortName, record?.className, record?.classSource, record?.source].map(lowerKey).join('|');
}

function subclassCopyKey(copy, record) {
  return [
    copy.shortName || record.shortName, copy.className || record.className,
    copy.classSource || record.classSource, copy.source || record.source,
  ].map(lowerKey).join('|');
}

// The references an entry tree points at (`refClassFeature` / `refSubclassFeature`).
function nestedRefs(node, type, field, out = []) {
  if (Array.isArray(node)) node.forEach((child) => nestedRefs(child, type, field, out));
  else if (node && typeof node === 'object') {
    if (node.type === type && node[field]) out.push(node[field]);
    Object.values(node).forEach((child) => nestedRefs(child, type, field, out));
  }
  return out;
}

function featureClosure(refs, index, refKey, type, field) {
  const seen = new Set();
  const out = [];
  const queue = refs.map((ref) => refString(ref, field)).filter(Boolean);
  while (queue.length) {
    const key = refKey(queue.shift());
    if (seen.has(key)) continue;
    seen.add(key);
    const feature = index.get(key);
    if (!feature) continue;
    out.push(feature);
    queue.push(...nestedRefs(feature.entries, type, field));
  }
  return out;
}

function featureNames(cls) {
  return asArray(cls?.classFeatures).map((ref) => stripSource(refString(ref, 'classFeature'))).filter(Boolean);
}

/**
 * The class data of the loaded files, `_copy` resolved: `allClasses` /
 * `allSubclasses` / features of every source (what copies point at) and the
 * allowed `classes` and `subclasses`. A skin comes back with `ruleClass`
 * (`reskinOf`: the class whose rules it follows) and `removedFeatures` (the
 * names of the base-class features it replaces).
 */
export function resolveClassData({ allClasses, classes, allSubclasses, subclasses, classFeatures, subclassFeatures }) {
  const resolvedClasses = resolveCopyRecords(classes, { pool: allClasses, keyOf: classKey });
  const baseByKey = new Map(resolveCopyRecords(allClasses, { keyOf: classKey }).map((cls) => [classKey(cls), cls]));
  const withRules = resolvedClasses.map((cls, index) => {
    const ruleClass = parseClassRef(asArray(cls.reskinOf)[0]);
    if (!ruleClass) return cls;
    const base = baseByKey.get(classKey(ruleClass));
    const own = new Set(featureNames(cls).map(lowerKey));
    const removedFeatures = featureNames(base).filter((name) => !own.has(lowerKey(name)));
    // The spells of the features it brings (Death Knight: Rune Strike, Find
    // Steed); the base class's own come with the base class's rules.
    const skinSpells = classes[index]?.additionalSpells;
    return {
      ...cls,
      ruleClass,
      removedFeatures: [...new Set(removedFeatures)],
      skinAdditionalSpells: Array.isArray(skinSpells) ? skinSpells : [],
    };
  });
  return {
    classes: withRules,
    subclasses: resolveCopyRecords(subclasses, { pool: allSubclasses, keyOf: subclassKey, copyKeyOf: subclassCopyKey })
      .map((sub, index) => (subclasses[index]?._copy ? { ...sub, isReprint: true } : sub)),
    classFeatures: resolveCopyRecords(classFeatures, { keyOf: classFeatureKey }),
    subclassFeatures: resolveCopyRecords(subclassFeatures, {
      keyOf: subclassFeatureKey,
      copyKeyOf: (copy, record) => subclassFeatureKey({ ...record, ...copy }),
    }),
  };
}

const indexCache = new WeakMap();

function featureIndex(list, keyOf) {
  if (!Array.isArray(list)) return new Map();
  if (!indexCache.has(list)) indexCache.set(list, new Map(list.map((feature) => [keyOf(feature), feature])));
  return indexCache.get(list);
}

// A feature as the class it is listed under shows it: a skin's inherited
// Paladin feature reads as a Death Knight one.
function asFeatureOf(feature, cls) {
  if (feature.className === cls.name && feature.classSource === cls.source) return feature;
  return { ...feature, className: cls.name, classSource: cls.source };
}

function isClass(record, name, source) {
  return record?.className === name && (record?.classSource === source || !record?.classSource);
}

/**
 * What one class brings in the builder: `subclasses` (its own, then those of
 * `includeSubclassesFrom` it does not reprint), `allFeatures` and
 * `allSubFeatures` (every listed subclass's features), all named after it.
 */
export function classScopedData(data, cls) {
  if (!cls?.name) return { subclasses: [], allFeatures: [], allSubFeatures: [] };
  const own = asArray(data?.subclasses).filter((sub) => isClass(sub, cls.name, cls.source));
  const shortNames = new Set(own.map((sub) => lowerKey(sub.shortName)));
  const included = asArray(cls.includeSubclassesFrom).map(parseClassRef).filter(Boolean).flatMap((ref) => (
    asArray(data?.subclasses).filter((sub) => isClass(sub, ref.name, ref.source) && !shortNames.has(lowerKey(sub.shortName)))
  ));
  const subclasses = [...own, ...included.map((sub) => ({ ...sub, className: cls.name, classSource: cls.source }))];

  const classIndex = featureIndex(data?.classFeatures, classFeatureKey);
  const allFeatures = Array.isArray(cls.classFeatures)
    ? featureClosure(cls.classFeatures, classIndex, classFeatureRefKey, 'refClassFeature', 'classFeature')
    : asArray(data?.classFeatures).filter((feature) => isClass(feature, cls.name, cls.source) && !feature.isReprinted);

  const subIndex = featureIndex(data?.subclassFeatures, subclassFeatureKey);
  const allSubFeatures = subclasses.flatMap((sub) => (
    featureClosure(asArray(sub.subclassFeatures), subIndex, subclassFeatureRefKey, 'refSubclassFeature', 'subclassFeature')
      .map((feature) => ({ ...asFeatureOf(feature, cls), subclassShortName: sub.shortName }))
  ));

  return {
    subclasses,
    allFeatures: allFeatures.map((feature) => asFeatureOf(feature, cls)),
    allSubFeatures,
  };
}

// The subclass a hero class (World of Warcraft) fixes: "your subclass choice is
// fixed" holds for the Death Knight and the Demon Hunter, the hero classes
// that bring a subclass of their own; the Evoker, whose only subclass is a
// reprinted Sorcerer one, chooses freely. Null when the choice is free.
export function fixedSubclassShortName(cls, subclasses) {
  if (!cls?.isHero) return null;
  const own = asArray(subclasses).filter((sub) => isClass(sub, cls.name, cls.source) && !sub.isReprint);
  return own.length === 1 ? own[0].shortName : null;
}

// The class whose rules a class follows: a skin's base class, else itself.
export function ruleClassOf(cls) {
  return cls?.ruleClass?.name || cls?.name || '';
}
