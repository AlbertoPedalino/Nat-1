function asArray(value) {
  return Array.isArray(value) ? value : value == null ? [] : [value];
}

function norm(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function refName(value) {
  return norm(String(value || '').split('|')[0]);
}

function meetsAbilityRequirement(requirement, scores) {
  return asArray(requirement).some((alternative) => (
    alternative
    && typeof alternative === 'object'
    && Object.entries(alternative).every(([ability, minimum]) => (
      Number(scores[norm(ability)] || 0) >= Number(minimum || 0)
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

function meetsFeatureRequirement(requirement, context) {
  return asArray(requirement).some((value) => context.hasFeature(value));
}

function meetsPrerequisiteEntry(entry, context) {
  if (!entry || typeof entry !== 'object') return true;
  // Campaign and otherSummary describe acquisition context; the builder has no
  // campaign selector, while special acquisition is already constrained by slots.
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
