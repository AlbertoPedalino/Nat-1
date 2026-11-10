import { adapterRegistry } from '../../../adapters/registry.js';
import { builtAbilityScores } from '../../../shared/character/progression/abilityScores.js';
import { classEntities } from '../../../shared/character/progression/classLevel.js';
import { ruleClassOf } from '../../../shared/content/catalogs/classScope.js';

/**
 * Multiclass rules validator for 5e 2024
 * Validates prerequisites, proficiencies, spellcasting restrictions
 */

export function getMulticlassPrerequisites(className) {
  const cfg = adapterRegistry.getClassRuntimeConfig(className);
  return cfg?.multiclassPrerequisites || [];
}

export function checkMulticlassPrerequisite(character, className) {
  const reqs = getMulticlassPrerequisites(className);
  if (!reqs.length) return { met: true, reason: '' };
  
  const scores = builtAbilityScores(character);
  
  const metGroups = reqs.map((group) => 
    Object.entries(group).every(([ability, min]) => scores[ability] >= min)
  );
  
  if (metGroups.some(Boolean)) {
    return { met: true, reason: '' };
  }
  
  const reqStrings = reqs.map((group) =>
    Object.entries(group).map(([ab, min]) => `${ab.toUpperCase()} ${min}`).join(' OR ')
  );
  
  return {
    met: false,
    reason: `Requires: ${reqStrings.join(' OR ')}`,
  };
}


// Why a class cannot be added as a multiclass, or '' when it can: it is
// already taken, or it is the same class under another name (a World of
// Warcraft skin is its base class: no Death Knight next to a Paladin, either
// way round). `replacingIndex` is the extra class being changed, which does
// not count.
export function multiclassBlockReason(character, cls, { replacingIndex = -1 } = {}) {
  const entities = classEntities(character).filter((entity) => entity.extraIndex !== replacingIndex);
  if (entities.some((entity) => entity.className === cls?.name)) return 'Class already taken';
  const rule = ruleClassOf(cls);
  if (entities.some((entity) => entity.ruleClassName === rule)) return `Same class as your ${rule} levels`;
  return '';
}
