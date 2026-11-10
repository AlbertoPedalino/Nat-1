import { canonicalProficiencyLabel } from '../progression/proficiencyDisplay.js';
import { collectOwnerEntries } from '../sheet/adapterOwners.js';
import { PROFICIENCY_CHOICE_KEYS, isChoicePlaceholderValue } from '../progression/typedProficiencies.js';
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

// The proficiency grants of the character's classes, subclasses and species
// (adapterOwners.js), each with where it comes from.
export function collectAdapterProfGrants(character) {
  return collectOwnerEntries(character, 'SheetProficiencies').map(({ entry, owner }) => ({
    ...entry, sourceType: owner.kind, sourceName: owner.name,
  }));
}
