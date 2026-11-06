import {
  FULL_SLOTS,
  HALF_SLOTS,
  PACT_SLOTS,
  PB_COST,
  STATS,
  THIRD_SLOTS,
} from '../constants.js';
import { primaryClassLevel } from '../../../shared/character/progression/classLevel.js';

export function pointBuySpent(scores) {
  return STATS.reduce((sum, stat) => sum + (PB_COST[scores[stat]] || 0), 0);
}

export function getBackgroundPool(background) {
  if (!background?.ability?.length) return STATS;
  const ability = background.ability[0];
  if (ability.choose?.weighted?.from?.length) return ability.choose.weighted.from;
  if (ability.choose?.from?.length) return ability.choose.from;
  const direct = Object.keys(ability).filter((key) => STATS.includes(key));
  return direct.length ? direct : STATS;
}

export function getBackgroundPattern(background, index = 0) {
  if (!background?.ability?.length) return [2, 1];
  const ability = background.ability[Math.min(index, background.ability.length - 1)];
  if (ability?.choose?.weighted?.weights?.length) return ability.choose.weighted.weights;
  const values = Object.values(ability || {}).filter((value) => typeof value === 'number').sort((a, b) => b - a);
  return values.length ? values : [2, 1];
}

export function getHitDieFaces(classObject) {
  return classObject?.hd?.faces || classObject?.hd?.[0]?.faces || 8;
}

export function getCasterProgression(className, classObject, subclassName) {
  const name = String(className || classObject?.name || '').toLowerCase();
  const explicit = classObject?.casterProgression;
  if (explicit === 'full' || explicit === 'half' || explicit === 'pact') return explicit;
  if (['bard', 'cleric', 'druid', 'sorcerer', 'wizard'].includes(name)) return 'full';
  if (['paladin', 'ranger', 'artificer'].includes(name)) return name === 'artificer' ? 'artificer' : 'half';
  if (name === 'warlock') return 'pact';
  if (name === 'fighter' && String(subclassName || '').toLowerCase().includes('eldritch')) return 'third';
  if (name === 'rogue' && String(subclassName || '').toLowerCase().includes('arcane')) return 'third';
  return null;
}

export function getCasterContribution(progression, level) {
  if (progression === 'full') return level;
  if (progression === 'half') return Math.floor(level / 2);
  if (progression === 'artificer') return Math.ceil(level / 2);
  if (progression === 'third') return Math.floor(level / 3);
  return 0;
}

function singleClassSlots(progression, level) {
  if (progression === 'full') return FULL_SLOTS[level] || [];
  if (progression === 'half' || progression === 'artificer') return HALF_SLOTS[level] || [];
  if (progression === 'third') return THIRD_SLOTS[level] || [];
  return [];
}

// Slots are one shared pool for the whole character. The multiclass table only
// applies when more than one class has Spellcasting; Pact Magic stays separate.
export function getSpellSlots(character) {
  const entries = [
    { progression: getCasterProgression(character.className, character.cls, character.subclassShortName), level: getPrimaryClassLevel(character) },
    ...(character.extraClasses || []).map((extra) => ({
      progression: getCasterProgression(extra.name, extra.cls, extra.subclassShortName),
      level: extra.level || 1,
    })),
  ].filter((entry) => entry.progression);

  const pactEntry = entries.find((entry) => entry.progression === 'pact');
  const pact = pactEntry ? PACT_SLOTS[Math.min(20, pactEntry.level)] || null : null;
  const regular = entries.filter((entry) => entry.progression !== 'pact');

  if (regular.length === 1) {
    return { slots: singleClassSlots(regular[0].progression, Math.min(20, regular[0].level)), pact };
  }
  const casterLevel = regular.reduce((sum, entry) => sum + getCasterContribution(entry.progression, entry.level), 0);
  return { slots: casterLevel > 0 ? FULL_SLOTS[Math.min(20, casterLevel)] || [] : [], pact };
}

// Re-exported from the shared canonical accessor so the builder and sheet share
// one derivation. Kept as a named export for existing importers.
export const getPrimaryClassLevel = primaryClassLevel;

