import { adapterRegistry } from '../../../adapters/registry.js';
import { warlockInvocationSelections } from '../../../shared/character/progression/warlockUtils.js';
import { buildOptionalFeatureEntryLookup, optionalFeatureOptions } from '../../../shared/character/progression/optionalFeatures.js';
import { classEntities } from '../../../shared/character/progression/classLevel.js';
import { asArray } from '../../../shared/lists.js';
import { choiceKey } from '../../../shared/content/nameKeys.js';
import { stripMarkup } from '../../../shared/content/markupText.js';

// Which class, subclass and invocation features the Features tab shows:
// level, class/subclass identity and choice gates.

export function collectWarlockInvocationFeatures(C) {
  // Levels from the optional-feature data; which ones repeat from the adapter.
  const meta = adapterRegistry.getClassSheetChoiceMeta('Warlock');
  const repeatable = new Set((meta?.repeatableInvocations || []).map(choiceKey));
  const invByName = new Map(
    optionalFeatureOptions(C?.optionalFeatureEntries, 'EI').map((entry) => [choiceKey(entry.name), entry]),
  );
  // Live 2024 invocation descriptions (rich 5etools entries) from optionalfeatures.json.
  const liveEntries = buildOptionalFeatureEntryLookup(C?.optionalFeatureEntries, 'EI');
  const out = [];
  const pushForPrefix = (keyPrefix, ownerLevel = 1) => {
    const selected = warlockInvocationSelections(C, keyPrefix);
    if (!selected.length) return;
    const counts = new Map();
    selected.forEach((name) => {
      const clean = cleanChoiceText(name);
      if (!clean) return;
      counts.set(clean, (counts.get(clean) || 0) + 1);
    });
    counts.forEach((count, selectedName) => {
      const data = invByName.get(choiceKey(selectedName)) || null;
      out.push({
        name: count > 1 ? `${selectedName} x${count}` : selectedName,
        level: Number(data?.minLevel || ownerLevel || 1),
        source: repeatable.has(choiceKey(selectedName)) ? 'Invocation - Repeatable' : 'Invocation',
        sourceKind: 'class',
        entries: liveEntries(selectedName) || null,
      });
    });
  };

  classEntities(C).forEach((entity) => {
    if (choiceKey(entity.className) === 'warlock') pushForPrefix(entity.choicePrefix, entity.level);
  });

  return dedupeFeatures(out);
}

export function collectClassBuckets(C) {
  return classEntities(C).map((entity) => {
    const { className, subclassShortName, level, choicePrefix, entry } = entity;
    const classFeatures = collectValidClassFeatures({
      features: entry?.allClassFeatures || entry?.allFeatures || [],
      className,
      level,
      character: C,
      choicePrefix,
    }).map((feature) => ({ ...feature, source: className || 'Class', sourceKind: 'class' }));

    const subclassFeatures = collectValidSubclassFeatures({
      features: entry?.allSubFeatures || [],
      className,
      subclassName: subclassShortName,
      level,
      character: C,
      choicePrefix,
    }).map((feature) => ({ ...feature, source: subclassShortName || 'Subclass', sourceKind: 'subclass' }));

    const subtitle = subclassShortName ? ` - ${subclassShortName}` : '';
    return {
      kind: entity.isPrimary ? 'class' : 'multiclass',
      name: className,
      title: entity.isPrimary
        ? `${className} ${level}${subtitle}`
        : `MC ${entity.extraIndex + 1} - ${className} ${level}${subtitle}`,
      index: entity.extraIndex,
      features: dedupeFeatures([...classFeatures, ...subclassFeatures]),
    };
  }).filter((bucket) => bucket.features.length);
}

function collectValidClassFeatures({ features, className, level, character, choicePrefix }) {
  return (features || [])
    .filter((feature) => featureIsAvailable(feature, level))
    .filter((feature) => featureMatchesClass(feature, className))
    .filter((feature) => !hasSubclassIdentity(feature))
    .filter((feature) => featurePassesChoiceGates(feature, character, choicePrefix));
}

function collectValidSubclassFeatures({ features, className, subclassName, level, character, choicePrefix }) {
  if (!subclassName) return [];
  return (features || [])
    .filter((feature) => featureIsAvailable(feature, level))
    .filter((feature) => featureMatchesClass(feature, className))
    .filter((feature) => featureMatchesSubclass(feature, subclassName))
    .filter((feature) => featurePassesChoiceGates(feature, character, choicePrefix));
}


function featureIsAvailable(feature, level) {
  if (!feature || feature.isReprinted) return false;
  const featureLevel = Number(feature?.level || 1);
  return featureLevel <= Number(level || 1);
}

function featureMatchesClass(feature, className) {
  const target = choiceKey(className);
  if (!target) return true;

  const explicit = feature?.className || feature?.class?.name || feature?.class;
  if (explicit) return choiceKey(explicit) === target;

  const ref = feature?.classFeature || feature?.subclassFeature;
  const parsedClass = parseFeatureRefClass(ref);
  if (parsedClass) return choiceKey(parsedClass) === target;

  // If the feature has no class metadata, assume the caller already supplied
  // the class-specific list (common for saved snapshots).
  return true;
}

function hasSubclassIdentity(feature) {
  return Boolean(
    feature?.subclassShortName
    || feature?.subclassName
    || feature?.subclass?.shortName
    || feature?.subclass?.name
    || feature?.subclassFeature
  );
}

function featureMatchesSubclass(feature, subclassName) {
  const target = choiceKey(subclassName);
  if (!target) return false;

  const explicit = feature?.subclassShortName
    || feature?.subclassName
    || feature?.subclass?.shortName
    || feature?.subclass?.name;
  if (explicit) return choiceKey(explicit) === target;

  const parsedSubclass = parseFeatureRefSubclass(feature?.subclassFeature);
  if (parsedSubclass) return choiceKey(parsedSubclass) === target;

  // If this list is already pre-filtered and lacks subclass metadata, keep it.
  return true;
}

function parseFeatureRefClass(ref) {
  if (!ref || typeof ref !== 'string') return '';
  const parts = ref.split('|').map((part) => part.trim()).filter(Boolean);
  // 5etools refs usually look like: Name|Class|Source|Level
  return parts.length >= 2 ? parts[1] : '';
}

function parseFeatureRefSubclass(ref) {
  if (!ref || typeof ref !== 'string') return '';
  const parts = ref.split('|').map((part) => part.trim()).filter(Boolean);
  // Subclass refs usually include: Name|Class|ClassSource|Subclass|SubclassSource|Level
  return parts.length >= 4 ? parts[3] : '';
}

function featurePassesChoiceGates(feature, character, choicePrefix = '') {
  const gates = [
    ...asArray(feature?.requiredChoice),
    ...asArray(feature?.requiredChoices),
    ...asArray(feature?.choiceRequirement),
    ...asArray(feature?.choiceRequirements),
  ];
  if (!gates.length) return true;
  return gates.every((gate) => choiceGatePasses(gate, character, choicePrefix));
}

function choiceGatePasses(gate, character, choicePrefix = '') {
  if (!gate) return true;
  if (typeof gate === 'function') {
    try { return !!gate(character); } catch { return false; }
  }
  if (typeof gate === 'string') return hasChoiceValue(character, gate, null, choicePrefix);
  const key = gate.key || gate.choiceKey || gate.id;
  if (!key) return true;
  const expected = gate.value ?? gate.values ?? gate.option ?? gate.options ?? null;
  return hasChoiceValue(character, key, expected, choicePrefix);
}

function hasChoiceValue(character, key, expected, choicePrefix = '') {
  const choices = character?.choices || {};
  const direct = choices[key];
  const prefixed = choices[`${choicePrefix}${key}`];
  const stored = prefixed != null ? prefixed : direct;
  if (stored == null || stored === '') return false;
  if (expected == null) return true;

  const storedValues = asArray(stored).map(cleanChoiceText).map(choiceKey).filter(Boolean);
  const expectedValues = asArray(expected).map(cleanChoiceText).map(choiceKey).filter(Boolean);
  if (!expectedValues.length) return true;
  return expectedValues.some((value) => storedValues.includes(value));
}

function dedupeFeatures(features) {
  const seen = new Set();
  const out = [];
  (features || []).forEach((feature) => {
    const key = `${choiceKey(feature?.name)}|${Number(feature?.level || 0)}|${choiceKey(feature?.source)}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(feature);
  });
  return out.sort((a, b) => Number(a?.level || 0) - Number(b?.level || 0));
}

export function featureKey(feature) {
  return `${choiceKey(feature?.name)}|${Number(feature?.level || 0)}|${choiceKey(feature?.source)}`;
}

function cleanChoiceText(text) {
  return stripMarkup(text)
    .split('|')[0]
    .replace(/_/g, ' ')
    .trim();
}
