// Advantage/disadvantage sources for a creature's own d20 roll, from what the
// fight knows about it: its conditions (CONDITION_EFFECTS). The sheet folds
// richer sources (features, armour, items) itself; a stat block has only
// these. Pure and dependency-free, like the table it reads.
//
//   kind    'attack' | 'save' | 'check'
//   ability 'str' … 'cha' for a saving throw (DEX saves have their own rules)
//
// Returns the unfolded { adv, disadv } (fold with advArgFor), `autoFail` for a
// STR/DEX save the creature fails without rolling (Paralyzed, Stunned…), and
// `situational`: the disadvantages that hold only sometimes (Frightened with
// its source in sight, Grappled against anyone but the grappler) as
// [{ source, note }] — reminders, never forced onto the roll, as on the sheet
// (describeAttackRoll / describeCheckDisadvantage).

import { getConditionalConditionEffects, hasConditionEffect } from './conditions.js';

export function creatureRollSources({ conditions } = {}, kind, ability = null) {
  conditions = Array.isArray(conditions) ? conditions : [];
  let adv = false;
  let disadv = false;
  let situational = [];
  if (kind === 'attack') {
    adv = hasConditionEffect(conditions, 'yourAttacksAdv');
    disadv = hasConditionEffect(conditions, 'yourAttacksDisadv');
    situational = getConditionalConditionEffects(conditions, 'yourAttacksDisadv');
  } else if (kind === 'check') {
    disadv = hasConditionEffect(conditions, 'abilityChecksDisadv');
    situational = getConditionalConditionEffects(conditions, 'abilityChecksDisadv');
  } else if (kind === 'save' && ability === 'dex') {
    disadv = hasConditionEffect(conditions, 'dexSaveDisadv');
  }
  const autoFail = kind === 'save' && (ability === 'str' || ability === 'dex')
    && hasConditionEffect(conditions, 'autoFailStrDexSave');
  return { adv, disadv, autoFail, situational };
}
