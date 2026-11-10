import { asArray } from '../../../shared/lists.js';
import { matchKey, stripSource } from '../../../shared/content/nameKeys.js';
function refName(value) {
  return matchKey(stripSource(value));
}

function meetsAbilityRequirement(requirement, scores) {
  return asArray(requirement).some((alternative) => (
    alternative
    && typeof alternative === 'object'
    && Object.entries(alternative).every(([ability, minimum]) => (
      Number(scores[matchKey(ability)] || 0) >= Number(minimum || 0)
    ))
  ));
}

function meetsFeatRequirement(requirement, ownedFeatNames) {
  return asArray(requirement).some((value) => ownedFeatNames.has(refName(value)));
}

function meetsCategoryRequirement(requirement, ownedCategories) {
  return asArray(requirement).some((value) => ownedCategories.has(String(value)));
}

function meetsProficiencyRequirement(requirement, context) {
  return asArray(requirement).some((alternative) => (
    alternative
    && typeof alternative === 'object'
    && Object.entries(alternative).every(([kind, value]) => {
      if (kind === 'armor') return context.hasArmorTraining(value);
      if (kind === 'weaponGroup') return context.hasWeaponGroup(value);
      return false;
    })
  ));
}

// `race: [{ name: 'human' }]`: the species by name, whatever its book.
function meetsSpeciesRequirement(requirement, speciesName) {
  const species = String(speciesName || '').toLowerCase();
  return asArray(requirement).some((race) => String(race?.name || '').toLowerCase() === species);
}

function meetsFeatureRequirement(requirement, context) {
  return asArray(requirement).some((value) => context.hasFeature(value));
}

function meetsPrerequisiteEntry(entry, context) {
  if (!entry || typeof entry !== 'object') return true;
  // Campaign describes acquisition context (the builder has no campaign
  // selector); a special acquisition only counts when it names a class the
  // character lacks (Void Warrior: Demon Hunter), the slot constrains the rest.
  if (entry.race && !meetsSpeciesRequirement(entry.race, context.speciesName)) return false;
  if (entry.otherSummary && context.hasNamedClass?.(entry.otherSummary.entry) === false) return false;
  if (entry.level != null && context.level < Number(entry.level || 0)) return false;
  if (entry.ability && !meetsAbilityRequirement(entry.ability, context.scores)) return false;
  if (entry.feat && !meetsFeatRequirement(entry.feat, context.ownedFeatNames)) return false;
  if (entry.featCategory && !meetsCategoryRequirement(entry.featCategory, context.ownedCategories)) return false;
  if (entry.exclusiveFeatCategory && meetsCategoryRequirement(entry.exclusiveFeatCategory, context.ownedCategories)) return false;
  if (entry.proficiency && !meetsProficiencyRequirement(entry.proficiency, context)) return false;
  if (entry.feature && !meetsFeatureRequirement(entry.feature, context)) return false;
  if (entry.spellcasting2020 && !context.hasSpellcasting) return false;
  return true;
}

export function characterWithoutFeatChoiceSlot(character, slotKey) {
  if (!slotKey) return character;
  const choices = {};
  Object.entries(character?.choices || {}).forEach(([key, value]) => {
    if (key === slotKey || key.startsWith(`${slotKey}_`)) return;
    choices[key] = value;
  });
  return { ...character, choices };
}

export function meetsFeatPrerequisites(feat, context) {
  const prerequisite = asArray(feat?.prerequisite).filter(Boolean);
  if (!prerequisite.length) return true;
  return prerequisite.some((entry) => meetsPrerequisiteEntry(entry, context));
}
