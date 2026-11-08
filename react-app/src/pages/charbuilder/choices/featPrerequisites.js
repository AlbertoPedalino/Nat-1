import { collectOwnedFeatNames } from '../../../shared/character/progression/selectedFeats.js';
import { classEntities } from '../../../shared/character/progression/classLevel.js';
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
  const names = new Set();
  const addAvailable = (features, level) => {
    (features || []).forEach((feature) => {
      if ((Number(feature?.level) || 0) > level) return;
      const name = matchKey(feature?.name);
      if (name) names.add(name);
    });
  };

  classEntities(character).forEach(({ entry, level }) => {
    addAvailable(entry?.allFeatures, level);
    addAvailable(entry?.allSubFeatures, level);
  });
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

  return {
    level: Number(baseCharacter.level || 1),
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

