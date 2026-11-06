import { CORE_2024_SOURCE_PRIORITY, isAllowedSource } from '../../../shared/content/sourcePriority.js';
import { loadGameData } from '../../../shared/content/gameData.js';

// The rules glossary of the 2024 manuals: senses, conditions, skills, actions
// and variant rules.

export async function loadSenses() {
  const data = await loadGameData('senses.json');
  return data.sense || [];
}

// XPHB (2024) condition descriptions, keyed by lowercased name to match the
// CONDITIONS table keys in charsheet/logic/conditions.js (e.g. "blinded"). Returns a map of
// key -> 5etools entries[] for rendering via entriesToTextBlocks/EntryBlocks.
export async function loadConditions() {
  const data = await loadGameData('conditionsdiseases.json');
  const out = {};
  (data.condition || [])
    .filter((c) => c.source === 'XPHB')
    .forEach((c) => { out[String(c.name).toLowerCase()] = c.entries || []; });
  return out;
}

// Whole condition records of the supported manuals (name, source, entries),
// for a reader that lists them rather than looks one up by key.
export async function loadConditionRecords() {
  const data = await loadGameData('conditionsdiseases.json');
  return (data.condition || [])
    .filter((condition) => isAllowedSource(condition.source, CORE_2024_SOURCE_PRIORITY) && Array.isArray(condition.entries));
}

// The skills of the 2024 rules (Acrobatics, Stealth…).
export async function loadSkills() {
  const data = await loadGameData('skills.json');
  return (data.skill || [])
    .filter((skill) => isAllowedSource(skill.source, CORE_2024_SOURCE_PRIORITY) && Array.isArray(skill.entries));
}

// The actions of the 2024 rules (Attack, Dash, Help…).
export async function loadActions() {
  const data = await loadGameData('actions.json');
  return (data.action || [])
    .filter((action) => isAllowedSource(action.source, CORE_2024_SOURCE_PRIORITY) && Array.isArray(action.entries));
}

export async function loadVariantRules() {
  const data = await loadGameData('variantrules.json');
  return (data.variantrule || []).filter((rule) => (
    rule?.name
    && rule?.source
    && Array.isArray(rule.entries)
  ));
}
