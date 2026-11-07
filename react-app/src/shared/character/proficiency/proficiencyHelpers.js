import { adapterRegistry } from '../../../adapters/registry.js';
import { canonicalProficiencyLabel } from '../progression/proficiencyDisplay.js';
import { classEntities } from '../progression/classLevel.js';
import { PROFICIENCY_CHOICE_KEYS, isChoicePlaceholderValue } from '../progression/typedProficiencies.js';
import { matchKey, stripSource } from '../../content/nameKeys.js';
import { asArray } from '../../lists.js';

export function normalizeLabel(value) {
  return canonicalProficiencyLabel(value);
}

export function addFixedLabels(source, set) {
  const arr = asArray(source);
  arr.forEach((entry) => {
    if (!entry) return;
    if (typeof entry === 'string') {
      entry.split(/[;,]/)
        .filter((v) => !isChoicePlaceholderValue(v))
        .map(normalizeLabel)
        .filter(Boolean)
        .forEach((v) => set.add(v));
      return;
    }
    if (typeof entry !== 'object') return;
    Object.keys(entry)
      .filter((k) => !PROFICIENCY_CHOICE_KEYS.includes(k) && entry[k] !== false && !isChoicePlaceholderValue(k))
      .map(normalizeLabel)
      .filter(Boolean)
      .forEach((v) => set.add(v));
  });
}

export function collectFixedFeatureProfs(character, field) {
  const out = new Set();
  const features = [
    ...(character?.allClassFeatures || []),
    ...(character?.allFeatSnapshots || []),
    ...(character?.backgroundSnapshot ? [character.backgroundSnapshot] : []),
  ];
  features.forEach((feature) => {
    const raw = feature?.[field];
    if (!raw) return;
    const arr = asArray(raw);
    arr.forEach((entry) => {
      if (typeof entry === 'string') {
        entry.split(/[;,]/).map(normalizeLabel).filter(Boolean).forEach((v) => out.add(v));
      } else if (entry && typeof entry === 'object') {
        Object.keys(entry)
          .filter((k) => !PROFICIENCY_CHOICE_KEYS.includes(k) && entry[k] !== false)
          .map(normalizeLabel)
          .filter(Boolean)
          .forEach((v) => out.add(v));
      }
    });
  });
  return out;
}

function choiceMatches(character, requiredChoice, prefix = '') {
  if (!requiredChoice?.key) return true;
  const choices = character?.choices || {};
  const keys = [requiredChoice.key, `${prefix || ''}${requiredChoice.key}`].filter(Boolean);
  const wanted = asArray(requiredChoice.value);
  const wantedNorm = wanted.map((value) => matchKey(stripSource(value)));
  return keys.some((key) => {
    const stored = choices[key];
    const values = Array.isArray(stored) ? stored : (stored ? [stored] : []);
    return values.some((value) => wantedNorm.includes(matchKey(stripSource(value))));
  });
}

export function collectAdapterProfGrants(character) {
  const grants = [];
  const push = (list, level, prefix = '', sourceType = '', sourceName = '') => {
    (list || []).forEach((grant) => {
      if (!grant || typeof grant !== 'object') return;
      if ((level || 1) < Number(grant.minLevel || 1)) return;
      if (grant.requiredChoice && !choiceMatches(character, grant.requiredChoice, prefix)) return;
      grants.push({ ...grant, sourceType, sourceName });
    });
  };
  const collectEntity = (className, subclassShortName, level, prefix = '') => {
    push(adapterRegistry.getClassSheetProficiencies(className), level, prefix, 'class', className);
    push(adapterRegistry.getSubclassSheetProficiencies(className, subclassShortName), level, prefix, 'subclass', subclassShortName);
  };
  classEntities(character).forEach((entity) => {
    collectEntity(entity.className, entity.subclassShortName, entity.level, entity.choicePrefix);
  });
  push(
    adapterRegistry.getSpeciesSheetProficiencies(character?.speciesName || '', character?.speciesSource || ''),
    character?.level || 1,
    '',
    'species',
    character?.speciesName || '',
  );
  return grants;
}
