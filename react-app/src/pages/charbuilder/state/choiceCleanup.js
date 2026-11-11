import { getChoiceLevel } from '../../../shared/character/progression/choiceLevels.js';
import { isFeatKey, isFeatDetailKey } from '../../../shared/character/progression/featChoiceKeys.js';
import { matchKey, stripSource } from '../../../shared/content/nameKeys.js';
import { multiclassLevels, primaryClassLevel } from '../../../shared/character/progression/classLevel.js';
import { stripMarkup } from '../../../shared/content/markupText.js';

// Keeping the builder's stored choices consistent: what to drop when a level,
// species or feat changes, and the character level from its classes.

// Fields whose value feeds normalizeCharacterChoices. When a reducer patch touches
// any of them, normalizedChoices is rebuilt so it stays the single source of truth
// for derived proficiencies/expertise (consumed by the sheet and previews).
const NORMALIZE_SOURCE_FIELDS = [
  'choices',
  'selectedSkills',
  'selectedTools',
  'selectedLanguages',
];

export function patchTouchesNormalizeSource(patch) {
  return !!patch && NORMALIZE_SOURCE_FIELDS.some(
    (field) => Object.prototype.hasOwnProperty.call(patch, field),
  );
}

export function pruneOrphanFeatChoices(choices = {}) {
  if (!choices || typeof choices !== 'object') return choices;
  const ownerKeys = Object.keys(choices)
    .filter((key) => isFeatKey(key) && !isFeatDetailKey(key) && choices[key] != null && choices[key] !== '');
  const next = { ...choices };
  let mutated = false;
  Object.keys(next).forEach((key) => {
    if (!isFeatDetailKey(key)) return;
    const hasOwner = ownerKeys.some((owner) => key === owner || key.startsWith(`${owner}_`));
    if (!hasOwner) {
      delete next[key];
      mutated = true;
    }
  });
  return mutated ? next : choices;
}

export function hasLevelAbove(key, classLevel) {
  const k = String(key || '');
  // Generic: feat_asi_lv{N}, bard_expertise_lv{N}, etc.
  var match = k.match(/lv(\d+)/i);
  if (match) return Number(match[1]) > Number(classLevel);
  // Adapter-registered patterns: invocations, mystic arcanum, etc.
  var choiceLv = getChoiceLevel(k);
  return choiceLv != null && Number(classLevel) < choiceLv;
}

export function cleanChoicesForLevel(choices, classLevel) {
  const out = {};
  Object.keys(choices || {}).forEach(function(key) {
    if (!hasLevelAbove(key, classLevel)) out[key] = choices[key];
  });
  return out;
}

// Sum of levels from selected (named) multiclass slots. A blank slot — just added

// Total character level = primary class level + selected multiclass levels.
// Single source of truth for the stats level; XP is tracked separately (xp/set).
export function totalCharacterLevel(classLevel, extraClasses) {
  return (Number(classLevel) || 1) + multiclassLevels(extraClasses);
}

export function normalizeCharacterLevels(character = {}) {
  const classLevel = primaryClassLevel(character);
  return {
    ...character,
    classLevel,
    level: totalCharacterLevel(classLevel, character.extraClasses),
  };
}

export function normChoice(value) {
  return matchKey(stripSource(stripMarkup(value)));
}

function isSpeciesChoiceKey(key) {
  const k = String(key || '');
  return (
    k.startsWith('species_') ||
    k === 'khoravar_skill_versatility'
  );
}

export function clearSpeciesChoices(choices = {}) {
  const next = { ...choices };
  Object.keys(next).forEach((key) => {
    if (isSpeciesChoiceKey(key)) delete next[key];
  });
  return next;
}

export function pruneStaleSpeciesLineageChoices(choices = {}, versionValue) {
  const stored = matchKey(Array.isArray(versionValue) ? versionValue[0] : versionValue);
  const next = { ...choices };
  Object.keys(next).forEach((key) => {
    const m = key.match(/^species_(.+?)_(cantrip|spell)(?:_|$)/);
    if (!m) return;
    if (key === 'species_spell_ability') return;
    const keyLineage = m[1].replace(/_/g, '').toLowerCase();
    if (!stored || keyLineage !== stored) delete next[key];
  });
  return next;
}

export function clearChoicePrefix(choices = {}, prefix) {
  const target = String(prefix || '');
  if (!target) return { ...choices };
  const next = { ...choices };
  Object.keys(next).forEach((key) => {
    if (String(key).startsWith(target)) delete next[key];
  });
  return next;
}
