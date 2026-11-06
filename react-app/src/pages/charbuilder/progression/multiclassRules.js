import { adapterRegistry as installedRegistry } from '../../../adapters/registry.js';
import { builtAbilityScore } from '../../../shared/character/progression/abilityScores.js';

/**
 * Multiclass rules validator for 5e 2024
 * Validates prerequisites, proficiencies, spellcasting restrictions
 */

export function getMulticlassPrerequisites(className) {
  const cfg = installedRegistry.getClassRuntimeConfig(className);
  return cfg?.multiclassPrerequisites || [];
}

export function checkMulticlassPrerequisite(character, className) {
  const reqs = getMulticlassPrerequisites(className);
  if (!reqs.length) return { met: true, reason: '' };
  
  const scores = {
    str: builtAbilityScore(character, 'str'),
    dex: builtAbilityScore(character, 'dex'),
    con: builtAbilityScore(character, 'con'),
    int: builtAbilityScore(character, 'int'),
    wis: builtAbilityScore(character, 'wis'),
    cha: builtAbilityScore(character, 'cha'),
  };
  
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

export function getMulticlassProficienciesGained(className, cls = null) {
  const cfg = installedRegistry.getClassRuntimeConfig(className);
  // Live only: adapter runtime config, then the class JSON
  // (`cls.multiclassing.proficienciesGained`). No hardcoded fallback — returns
  // null when the data source carries nothing.
  return cfg?.multiclassProficienciesGained
    || cls?.multiclassing?.proficienciesGained
    || cls?.multiclassProficienciesGained
    || null;
}

