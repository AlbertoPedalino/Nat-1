import { adapterRegistry } from '../../../adapters/registry.js';
import { builtAbilityScores } from '../../../shared/character/progression/abilityScores.js';

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

