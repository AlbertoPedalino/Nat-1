import { PB_COST } from '../constants.js';
import { primaryClassLevel } from '../../../shared/character/progression/classLevel.js';
import { ABILITIES } from '../../../shared/content/rulesVocabulary.js';
import { combinedSpellSlots } from '../../../shared/character/spells/casterProgression.js';

export function pointBuySpent(scores) {
  return ABILITIES.reduce((sum, stat) => sum + (PB_COST[scores[stat]] || 0), 0);
}

export function getBackgroundPool(background) {
  if (!background?.ability?.length) return ABILITIES;
  const ability = background.ability[0];
  if (ability.choose?.weighted?.from?.length) return ability.choose.weighted.from;
  if (ability.choose?.from?.length) return ability.choose.from;
  const direct = Object.keys(ability).filter((key) => ABILITIES.includes(key));
  return direct.length ? direct : ABILITIES;
}

export function getBackgroundPattern(background, index = 0) {
  if (!background?.ability?.length) return [2, 1];
  const ability = background.ability[Math.min(index, background.ability.length - 1)];
  if (ability?.choose?.weighted?.weights?.length) return ability.choose.weighted.weights;
  const values = Object.values(ability || {}).filter((value) => typeof value === 'number').sort((a, b) => b - a);
  return values.length ? values : [2, 1];
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

// Slots are one shared pool for the whole character. The multiclass table only
// applies when more than one class has Spellcasting; Pact Magic stays separate.
export function getSpellSlots(character) {
  const { regular, pact } = combinedSpellSlots([
    { progression: getCasterProgression(character.className, character.cls, character.subclassShortName), level: getPrimaryClassLevel(character) },
    ...(character.extraClasses || []).map((extra) => ({
      progression: getCasterProgression(extra.name, extra.cls, extra.subclassShortName),
      level: extra.level || 1,
    })),
  ]);
  return { slots: regular, pact };
}

// Re-exported from the shared canonical accessor so the builder and sheet share
// one derivation. Kept as a named export for existing importers.
export const getPrimaryClassLevel = primaryClassLevel;

