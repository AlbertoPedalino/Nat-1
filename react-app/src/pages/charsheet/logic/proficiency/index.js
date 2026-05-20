export {
  canonicalProperty,
  dedupeRules,
  formatRule,
  getWeaponCategory,
  inferRuleFromLabel,
  itemHasProperty,
  normalizeRule,
  normKey,
  processStructuredWeaponProficiencies,
  ruleKey,
  weaponMatchesRule,
  weaponNameKeys,
} from './weaponRules.js';

export {
  collectEquipmentProficiencySets,
  resolveWeaponProficiencyRules,
} from './equipmentSets.js';

export {
  getArmorTrainingInfo,
  getUntrainedArmor,
  getWeaponProficiencyInfo,
  hasNonProficientArmor,
} from './queries.js';

export { collectAllProficiencies } from './allProficiencies.js';
