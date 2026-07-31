import { installedRegistry } from '../../../../adapters/index.js';
import { canonicalProficiencyLabel } from '../../../../shared/character/proficiencyDisplay.js';
import { primaryClassLevel } from '../../../../shared/character/classLevel.js';
import { isChoicePlaceholderValue } from '../../../../shared/character/typedProficiencies.js';
import { normKey } from './weaponRules.js';

export const CHOICE_KEYS = ['choose', 'any', 'anyTool', 'anyArtisansTool', 'anyMusicalInstrument', 'anyGamingSet', 'anyStandard', 'anyExotic'];

export function normalizeLabel(value) {
  return canonicalProficiencyLabel(value);
}

export function addFixedLabels(source, set) {
  const arr = Array.isArray(source) ? source : [source];
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
      .filter((k) => !CHOICE_KEYS.includes(k) && entry[k] !== false && !isChoicePlaceholderValue(k))
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
    const arr = Array.isArray(raw) ? raw : [raw];
    arr.forEach((entry) => {
      if (typeof entry === 'string') {
        entry.split(/[;,]/).map(normalizeLabel).filter(Boolean).forEach((v) => out.add(v));
      } else if (entry && typeof entry === 'object') {
        Object.keys(entry)
          .filter((k) => !CHOICE_KEYS.includes(k) && entry[k] !== false)
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
  const wanted = Array.isArray(requiredChoice.value) ? requiredChoice.value : [requiredChoice.value];
  const wantedNorm = wanted.map((value) => normKey(String(value).split('|')[0]));
  return keys.some((key) => {
    const stored = choices[key];
    const values = Array.isArray(stored) ? stored : (stored ? [stored] : []);
    return values.some((value) => wantedNorm.includes(normKey(String(value).split('|')[0])));
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
    push(installedRegistry.getClassSheetProficiencies(className), level, prefix, 'class', className);
    push(installedRegistry.getSubclassSheetProficiencies(className, subclassShortName), level, prefix, 'subclass', subclassShortName);
  };
  collectEntity(
    character?.className || '',
    character?.subclassShortName || '',
    primaryClassLevel(character),
    '',
  );
  (character?.extraClasses || []).forEach((extra, index) => {
    collectEntity(extra?.name || '', extra?.subclassShortName || '', extra?.level || 1, `mc${index}_`);
  });
  push(
    installedRegistry.getSpeciesSheetProficiencies(character?.speciesName || '', character?.speciesSource || ''),
    character?.level || 1,
    '',
    'species',
    character?.speciesName || '',
  );
  return grants;
}
