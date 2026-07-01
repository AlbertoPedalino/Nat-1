import { collectOwnedFeatNames } from '../../../shared/character/selectedFeats.js';
import { primaryClassLevel } from '../../../shared/character/classLevel.js';
import { collectEquipmentProficiencySets } from '../../charsheet/logic/proficiency/index.js';
import { ARMOR_KIND_KEYS, armorSetTrainsKind } from '../../charsheet/logic/proficiency/armorRules.js';
import { getWeaponCategory, weaponMatchesRule } from '../../charsheet/logic/proficiency/weaponRules.js';
import { getAllFinalScores, getCasterProgression } from './calculations.js';
import {
  characterWithoutFeatChoiceSlot,
  meetsFeatPrerequisites,
} from './featPrerequisiteRules.js';
import { buildPreviewSheetCharacter } from './previewSheet.js';

function asArray(value) {
  return Array.isArray(value) ? value : value == null ? [] : [value];
}

function norm(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function featCategories(feat) {
  return asArray(feat?.categories?.length ? feat.categories : feat?.category)
    .map((value) => String(value || ''))
    .filter(Boolean);
}

function characterClassEntries(character) {
  return [
    {
      name: character?.className,
      cls: character?.cls || character?.clsSnapshot,
      subclass: character?.subclassShortName,
    },
    ...(character?.extraClasses || []).map((extra) => ({
      name: extra?.name,
      cls: extra?.cls || extra?.clsSnapshot,
      subclass: extra?.subclassShortName,
    })),
  ].filter((entry) => entry.name);
}

function collectFeatureNames(character, slotCategories) {
  const names = new Set();
  const addAvailable = (features, level) => {
    (features || []).forEach((feature) => {
      if ((Number(feature?.level) || 0) > level) return;
      const name = norm(feature?.name);
      if (name) names.add(name);
    });
  };

  const primaryLevel = primaryClassLevel(character);
  addAvailable(character?.allFeatures, primaryLevel);
  addAvailable(character?.allSubFeatures, primaryLevel);
  (character?.extraClasses || []).forEach((extra) => {
    const level = Number(extra?.level || 1);
    addAvailable(extra?.allFeatures, level);
    addAvailable(extra?.allSubFeatures, level);
  });
  if (asArray(slotCategories).some((category) => String(category).startsWith('FS'))) {
    names.add('fightingstyle');
  }
  return names;
}

function hasSpellcastingProgression(character, progression = null) {
  return characterClassEntries(character).some((entry) => {
    const current = getCasterProgression(entry.name, entry.cls, entry.subclass);
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
  }[norm(armor)];
  return !!code && armorSetTrainsKind(equipmentSets.armorSet, ARMOR_KIND_KEYS[code]);
}

function hasWeaponGroup(equipmentSets, items, group) {
  const wanted = norm(group);
  if (!wanted) return false;
  if (equipmentSets.weaponRules.some((rule) => (
    Object.keys(rule).length === 0 || norm(rule.category) === wanted
  ))) return true;
  return (items || []).some((item) => (
    norm(getWeaponCategory(item)) === wanted
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
  const ownedFeatNames = new Set(collectOwnedFeatNames(baseCharacter).map(norm));
  const ownedCategories = new Set();
  (feats || []).forEach((feat) => {
    if (!ownedFeatNames.has(norm(feat?.name))) return;
    featCategories(feat).forEach((category) => ownedCategories.add(category));
  });
  const sheetCharacter = buildPreviewSheetCharacter(baseCharacter);

  const featureNames = collectFeatureNames(baseCharacter, slotCategories);
  const hasSpellcasting = hasSpellcastingProgression(baseCharacter);
  const hasPactMagic = hasSpellcastingProgression(baseCharacter, 'pact');
  const equipmentSets = collectEquipmentProficiencySets(sheetCharacter);

  return {
    level: Number(baseCharacter.level || 1),
    scores: getAllFinalScores(baseCharacter),
    ownedFeatNames,
    ownedCategories,
    hasSpellcasting,
    hasArmorTraining: (armor) => hasArmorTraining(equipmentSets, armor),
    hasWeaponGroup: (group) => hasWeaponGroup(equipmentSets, items, group),
    hasFeature: (value) => {
      const feature = norm(value);
      if (feature === 'spellcasting') return hasSpellcasting;
      if (feature === 'pactmagic') return hasPactMagic;
      return featureNames.has(feature);
    },
  };
}

export { meetsFeatPrerequisites };
