import { spellAbilityChoiceKey } from '../../../shared/character/spells/spellAbilityChoice.js';
import { matchKey } from '../../../shared/content/nameKeys.js';
import { titleCase } from '../../../shared/ui/textCase.js';
import { SRC_COLOR, featSlotTone } from './spellSourceDisplay.js';
import { baseChoiceKey } from '../../../shared/character/progression/choiceUtils.js';

// What a builder choice key that holds a spell says about that spell: the slot
// it belongs to (feat-like or not), the class that owns it, whether it is a
// cantrip pick, the species lineage it requires, and the source tag it shows.

// The first string value of a stored choice (choices may be arrays).
export function firstChoiceString(raw) {
  if (raw == null) return null;
  const val = Array.isArray(raw) ? raw[0] : raw;
  return typeof val === 'string' ? val : null;
}

// The slot key in front of `_spell_known_…` / `_innate_` / `_prepared_` / `_expanded_`.
export function choiceSpellSlotKey(key) {
  const m = String(key || '').match(/^(.*?)_spell_(?:known|innate|prepared|expanded)_/);
  return m ? m[1] : null;
}

export function isFeatLikeSlotKey(C, slotKey) {
  const key = String(slotKey || '');
  const baseKey = baseChoiceKey(key);
  return (
    baseKey === 'feat_origin'
    || baseKey === 'species_origin_feat'
    || baseKey.startsWith('feat_')
    || baseKey.includes('boon')
    || baseKey.includes('fighting_style')
    || Object.prototype.hasOwnProperty.call(C?.normalizedChoices?.feats?.byKey || {}, key)
    || Object.prototype.hasOwnProperty.call(C?.normalizedChoices?.feats?.byKey || {}, baseKey)
  );
}

// The feat slot a spell choice key belongs to, or null when it is not a feat's.
export function featSpellSlotKey(C, key) {
  const slotKey = choiceSpellSlotKey(key);
  if (!slotKey || !isFeatLikeSlotKey(C, slotKey)) return null;
  return slotKey;
}

export function choiceKeyIsCantripChoice(key) {
  const m = String(key || '').match(/_spell_(?:known|innate|prepared|expanded)_\d+_(\d+)\|/);
  if (m) return Number(m[1]) === 0;
  return /(^|_)cantrip(s)?(_|$)/i.test(String(key || ''));
}

export function ownerClassFromChoiceKey(C, key) {
  const m = String(key || '').match(/^mc(\d+)_/);
  if (m) {
    const idx = Number(m[1]);
    return C?.extraClasses?.[idx]?.name || null;
  }
  return C?.className || null;
}

function speciesChoiceKeyLineage(key) {
  const m = String(key || '').match(/^species_(.+?)_(cantrip|spell)(?:_|$)/);
  if (!m) return null;
  return m[1].replace(/_/g, '').toLowerCase();
}

// A lineage-specific species spell choice counts only for the active lineage.
export function speciesChoiceKeyMatchesActiveLineage(C, key) {
  const keyLineage = speciesChoiceKeyLineage(key);
  if (!keyLineage) return true;
  const stored = String(C?.normalizedChoices?.species?.version || C?.choices?.species_version || '');
  const storedNorm = matchKey(stored);
  return !storedNorm || storedNorm === keyLineage;
}

// The feat chosen in a feat slot.
export function findFeatName(C, slotKey) {
  if (!C || !slotKey) return null;

  const direct = C?.choices?.[slotKey];
  if (direct && typeof direct === 'string' && !direct.startsWith('feat_')) return direct;

  const normalized = C?.normalizedChoices;
  if (normalized) {
    try {
      const byKey = normalized.feats?.byKey?.[slotKey];
      if (byKey && typeof byKey === 'string') return byKey;
    } catch {}
  }
  return null;
}

function findFeatNameByPrefix(C, key) {
  if (!key || typeof key !== 'string') return null;
  const m = key.match(/^(feat_.+?)_spell_(?:known|innate|prepared|expanded)_/);
  if (!m) return null;
  const prefix = m[1];
  let name = C?.choices?.[prefix];
  if (name && typeof name === 'string' && !name.startsWith('feat_')) return name;
  const parts = prefix.split('_');
  for (let i = parts.length - 1; i > 0; i--) {
    const testKey = parts.slice(0, i).join('_');
    if (testKey === 'feat') break;
    const val = C?.choices?.[testKey];
    if (val && typeof val === 'string' && !val.startsWith('feat_')) return val;
  }
  return null;
}

function findFeatNameByScanning(C, key) {
  if (!key || !C?.choices) return null;
  const keyPrefix = key.split('_spell_')[0];
  if (!keyPrefix || !keyPrefix.startsWith('feat_')) return null;
  const abilityKey = spellAbilityChoiceKey(keyPrefix);
  if (abilityKey in C.choices) {
    const val = C?.choices?.[keyPrefix];
    if (val && typeof val === 'string' && !val.startsWith('feat_')) return val;
  }
  for (const ck of Object.keys(C.choices)) {
    if (ck === abilityKey || ck.startsWith(abilityKey)) {
      const val = C?.choices?.[keyPrefix];
      if (val && typeof val === 'string' && !val.startsWith('feat_')) return val;
    }
  }
  return null;
}

// The source tag of a spell picked in a choice that no feat-meta entry covers.
export function sourceFromChoiceKey(C, key) {
  const grantKey = key.match(/^(.*)_(known|innate|prepared|expanded)_/i)?.[1];
  let featName = grantKey ? C?.choices?.[grantKey] : null;
  if (!featName && grantKey) {
    const shortened = grantKey.replace(/_[^_]+$/, '');
    if (shortened !== grantKey) featName = C?.choices?.[shortened] || null;
  }
  if (!featName) featName = findFeatNameByPrefix(C, key);
  if (!featName) featName = findFeatNameByScanning(C, key);
  if (!featName) {
    const slotKey = featSpellSlotKey(C, key);
    if (slotKey) featName = findFeatName(C, slotKey);
  }
  if (featName) return { label: String(featName), color: featSlotTone(key), originType: 'feat', originLabel: String(featName) };
  if (key.startsWith('feat_')) return { label: 'Feat', color: featSlotTone(key), originType: 'feat', originLabel: 'Feat' };
  if (key.startsWith('subclass_')) return { label: C?.subclassShortName || 'Subclass', color: SRC_COLOR.subclass, originType: 'subclass', originLabel: C?.subclassShortName || 'Subclass' };
  if (key.startsWith('species_')) {
    const lineage = C?.normalizedChoices?.species?.version
      || (Array.isArray(C?.choices?.species_version) ? C.choices.species_version[0] : C?.choices?.species_version);
    if (speciesChoiceKeyLineage(key) && lineage) {
      return { label: `${lineage} Lineage`, color: SRC_COLOR.species, originType: 'species', originLabel: String(lineage) };
    }
    return { label: C?.speciesName || 'Species', color: SRC_COLOR.species, originType: 'species', originLabel: C?.speciesName || 'Species' };
  }
  if (key.includes('tome')) return { label: 'Pact of the Tome', color: SRC_COLOR.choice, originType: 'invocation', originLabel: 'Pact of the Tome' };
  if (key.includes('mystic_arcanum')) return { label: 'M. Arcanum', color: SRC_COLOR.arcanum, originType: 'mystic_arcanum', originLabel: 'Mystic Arcanum' };
  if (key.startsWith('warlock_')) {
    const invName = titleCase(key.replace(/^warlock_/, '').replace(/_(cantrip|ritual).*$/, ''));
    if (invName) return { label: invName, color: SRC_COLOR.choice, originType: 'invocation', originLabel: invName };
  }
  return { label: 'Choice', color: SRC_COLOR.choice, originType: 'unknown', originLabel: 'Choice' };
}
