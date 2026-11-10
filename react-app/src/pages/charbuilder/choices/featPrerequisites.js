import { collectOwnedFeatNames } from '../../../shared/character/progression/selectedFeats.js';
import { classEntities, ownedClassFeatureNames } from '../../../shared/character/progression/classLevel.js';
import { collectEquipmentProficiencySets } from '../../../shared/character/proficiency/equipmentSets.js';
import { ARMOR_KIND_KEYS, armorSetTrainsKind } from '../../../shared/character/proficiency/armorRules.js';
import { getWeaponCategory, weaponMatchesRule } from '../../../shared/character/proficiency/weaponRules.js';
import { getSpellEntities, getSpellcastingProfile } from '../../../shared/character/spells/spellcasting.js';
import { normalizeCasterProgression } from '../../../shared/character/spells/casterProgression.js';
import { builtAbilityScores } from '../../../shared/character/progression/abilityScores.js';
import { characterWithoutFeatChoiceSlot } from './featPrerequisiteRules.js';
import { buildPreviewSheetCharacter } from '../preview/previewSheet.js';
import { asArray } from '../../../shared/lists.js';
import { matchKey } from '../../../shared/content/nameKeys.js';

function featCategories(feat) {
  return asArray(feat?.categories?.length ? feat.categories : feat?.category)
    .map((value) => String(value || ''))
    .filter(Boolean);
}

function collectFeatureNames(character, slotCategories) {
  const names = ownedClassFeatureNames(character);
  if (asArray(slotCategories).some((category) => String(category).startsWith('FS'))) {
    names.add('fightingstyle');
  }
  return names;
}

function hasSpellcastingProgression(character, progression = null) {
  return getSpellEntities(character).some((entity) => {
    const current = normalizeCasterProgression(getSpellcastingProfile(entity).casterProgression);
    return progression ? current === progression : !!current;
  });
}

function hasArmorTraining(equipmentSets, armor) {
  const code = {
    light: 'LA',
    medium: 'MA',
    heavy: 'HA',
    shield: 'S',
    shields: 'S',
  }[matchKey(armor)];
  return !!code && armorSetTrainsKind(equipmentSets.armorSet, ARMOR_KIND_KEYS[code]);
}

function hasWeaponGroup(equipmentSets, items, group) {
  const wanted = matchKey(group);
  if (!wanted) return false;
  if (equipmentSets.weaponRules.some((rule) => (
    Object.keys(rule).length === 0 || matchKey(rule.category) === wanted
  ))) return true;
  return (items || []).some((item) => (
    matchKey(getWeaponCategory(item)) === wanted
    && equipmentSets.weaponRules.some((rule) => weaponMatchesRule(item, rule))
  ));
}

export function buildFeatPrerequisiteContext({
  character,
  feats,
  items = [],
  slotKey = '',
  slotCategories = [],
  classNames = [],
}) {
  const baseCharacter = characterWithoutFeatChoiceSlot(character || {}, slotKey);
  const ownedFeatNames = new Set(collectOwnedFeatNames(baseCharacter).map(matchKey));
  const ownedCategories = new Set();
  (feats || []).forEach((feat) => {
    if (!ownedFeatNames.has(matchKey(feat?.name))) return;
    featCategories(feat).forEach((category) => ownedCategories.add(category));
  });
  const sheetCharacter = buildPreviewSheetCharacter(baseCharacter);

  const featureNames = collectFeatureNames(baseCharacter, slotCategories);
  const hasSpellcasting = hasSpellcastingProgression(baseCharacter);
  const hasPactMagic = hasSpellcastingProgression(baseCharacter, 'pact');
  const equipmentSets = collectEquipmentProficiencySets(sheetCharacter);

  const ownClasses = new Set(classEntities(baseCharacter).flatMap((entity) => [entity.className, entity.ruleClassName]).map(matchKey));
  const knownClasses = [...new Set(classNames.filter(Boolean))].sort((a, b) => b.length - a.length);

  return {
    level: Number(baseCharacter.level || 1),
    speciesName: baseCharacter.speciesName || '',
    // A special acquisition that names a class ("When Gaining the Level 2
    // Demon Hunter Fighting Style Feature"): met only with that class. Null
    // when the text names no class.
    hasNamedClass: (text) => {
      // Longest names first, each taken out once found: "Demon Hunter" is not
      // also a "Hunter".
      let rest = String(text || '');
      const named = knownClasses.filter((name) => {
        const pattern = new RegExp(`\\b${name}\\b`, 'gi');
        if (!pattern.test(rest)) return false;
        rest = rest.replace(pattern, ' ');
        return true;
      });
      if (!named.length) return null;
      return named.some((name) => ownClasses.has(matchKey(name)));
    },
    scores: builtAbilityScores(baseCharacter),
    ownedFeatNames,
    ownedCategories,
    hasSpellcasting,
    hasArmorTraining: (armor) => hasArmorTraining(equipmentSets, armor),
    hasWeaponGroup: (group) => hasWeaponGroup(equipmentSets, items, group),
    hasFeature: (value) => {
      const feature = matchKey(value);
      if (feature === 'spellcasting') return hasSpellcasting;
      if (feature === 'pactmagic') return hasPactMagic;
      return featureNames.has(feature);
    },
  };
}

