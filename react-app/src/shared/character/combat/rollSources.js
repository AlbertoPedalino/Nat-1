// Advantage/disadvantage sources for a creature's own d20 roll, from what the
// fight knows about it: its conditions (CONDITION_EFFECTS) and its
// advantage/disadvantage effects (combatEffects.js). The sheet folds richer
// sources (features, armour, items) itself; a stat block has only these.
// Pure and dependency-free, like the two tables it reads.
//
//   kind    'attack' | 'save' | 'check'
//   ability 'str' … 'cha' for a saving throw (DEX saves have their own rules)
//
// Returns the unfolded { adv, disadv } (fold with advArgFor) and `autoFail`
// for a STR/DEX save the creature fails without rolling (Paralyzed, Stunned…),
// which is a reminder rather than a roll mode.

import { hasConditionEffect } from './conditions.js';
import { effectRollAdvantage } from './combatEffects.js';

export function creatureRollSources({ conditions, effects } = {}, kind, ability = null) {
  conditions = Array.isArray(conditions) ? conditions : [];
  const fromEffects = effectRollAdvantage(effects, kind);
  let { adv, disadv } = fromEffects;
  if (kind === 'attack') {
    adv = adv || hasConditionEffect(conditions, 'yourAttacksAdv');
    disadv = disadv || hasConditionEffect(conditions, 'yourAttacksDisadv');
  } else if (kind === 'check') {
    disadv = disadv || hasConditionEffect(conditions, 'abilityChecksDisadv');
  } else if (kind === 'save' && ability === 'dex') {
    disadv = disadv || hasConditionEffect(conditions, 'dexSaveDisadv');
  }
  const autoFail = kind === 'save' && (ability === 'str' || ability === 'dex')
    && hasConditionEffect(conditions, 'autoFailStrDexSave');
  return { adv, disadv, autoFail };
}
