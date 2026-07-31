import { adapterRegistry as installedRegistry } from '../../../adapters/registry.js';
import { getFinalScore, getCasterProgression, getCasterContribution } from './calculations.js';

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
    str: getFinalScore(character, 'str'),
    dex: getFinalScore(character, 'dex'),
    con: getFinalScore(character, 'con'),
    int: getFinalScore(character, 'int'),
    wis: getFinalScore(character, 'wis'),
    cha: getFinalScore(character, 'cha'),
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

/**
 * Validate spellcasting combination (2024 rules)
 * Some casters can't easily combine (Pact vs Full/Half)
 */
export function checkSpellcastingMulticlass(character, newClassName) {
  const primaryProg = getCasterProgression(character.className, character.cls, character.subclassShortName);
  const newProg = getCasterProgression(newClassName);
  
  // Pact (Warlock) incompatibility warning
  if ((primaryProg === 'pact' && newProg && newProg !== 'pact') ||
      (newProg === 'pact' && primaryProg && primaryProg !== 'pact')) {
    return {
      warning: true,
      message: 'Pact Magic (Warlock) uses different slot mechanics. Spell slots may not combine correctly.',
    };
  }
  
  return { warning: false, message: '' };
}

/**
 * Get hit die rules for multiclass
 * In 5e, you roll only the NEW class's hit die, not combined
 */
export function getMulticlassHitDieRule(className) {
  const cfg = installedRegistry.getClassRuntimeConfig(className);
  const faces = cfg?.hd?.faces || 8;
  return {
    faces,
    rule: `Roll d${faces} and add CON mod for each ${className} level (not combined with other classes)`,
  };
}

/**
 * List all currently taken classes
 */
export function getTakenClasses(character) {
  const classes = new Set();
  if (character.className) classes.add(character.className);
  (character.extraClasses || []).forEach((extra) => {
    if (extra.name) classes.add(extra.name);
  });
  return Array.from(classes);
}

/**
 * Validate that all multiclass prerequisites are still met
 * (in case ability scores change)
 */
export function validateMulticlassPrerequisites(character) {
  const issues = [];
  
  // Check multiclass entries (not primary, primary can always be taken)
  (character.extraClasses || []).forEach((extra, idx) => {
    const { met, reason } = checkMulticlassPrerequisite(character, extra.name);
    if (!met) {
      issues.push({
        type: 'multiclass-prereq',
        classIndex: idx,
        className: extra.name,
        reason,
      });
    }
  });
  
  return issues;
}
