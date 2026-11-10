import { getFeatAsiBonus } from './abilityBonuses.js';
import { abilityModifier } from './abilityModifier.js';
import { getFinalAbilityScore } from '../inventory/itemEffects.js';
import { wildShapeAbilityScore } from '../forms/wildShapeForm.js';
import { ABILITIES } from '../../content/rulesVocabulary.js';
import { collectOwnerEntries } from '../sheet/adapterOwners.js';
import { asArray } from '../../lists.js';
import { matchKey } from '../../content/nameKeys.js';
import { clamp } from '../../numbers.js';

// A character's ability scores, in one place. The layers, in order:
//   base        what the player bought, assigned or rolled (8 until set)
//   background  the background's +2/+1 or +1/+1/+1, as the player chose it
//   feats/ASI   Ability Score Improvements and feats with an ability increase
//   features    class features that raise a score past 20 (Primal Champion)
//   items       equipped/attuned item bonuses and overrides, consumed Tomes
//   Wild Shape  replaces STR/DEX/CON with the beast's while transformed
// The first four are the score the character was built with (the builder
// shows it); all six are the score the sheet, AC, Hit Points, formulas and
// adapters use. Scores are always computed from the choices, never stored.

const BASE_SCORE_FIELDS = {
  pointbuy: 'pbScores',
  standard: 'arrAssign',
  manual: 'manualScores',
  dice: 'diceAssign',
};

// The background's split when it names none: +2 and +1.
export const DEFAULT_BACKGROUND_PATTERN = Object.freeze([2, 1]);

// The character field the base scores of a method live in (point buy when the
// method is unknown).
export function baseScoreField(method) {
  return BASE_SCORE_FIELDS[method] || BASE_SCORE_FIELDS.pointbuy;
}

export function baseAbilityScore(character, stat) {
  const value = character?.[baseScoreField(character?.scoreMethod)]?.[stat];
  const score = value == null || value === '' ? NaN : Number(value);
  return Number.isFinite(score) ? score : 8;
}

export function backgroundAbilityBonus(character, stat) {
  const index = (character?.backgroundAbilities || []).indexOf(stat);
  if (index < 0) return 0;
  const pattern = character.backgroundPattern?.length ? character.backgroundPattern : DEFAULT_BACKGROUND_PATTERN;
  return Number(pattern[index]) || 0;
}

// Class features that raise scores: `abilityScore` sheet effects
// { abilities, value, max } (Primal Champion: STR and CON +4, to a maximum of
// 25), each up to its own maximum. Only those effects are checked: other
// effects' conditions may read the scores.
function featureAbilityBonuses(character, stat, scoreBefore) {
  let score = scoreBefore;
  return collectOwnerEntries(character, 'SheetEffects', { only: (entry) => matchKey(entry?.type) === 'abilityscore' })
    .filter(({ entry }) => asArray(entry.abilities).includes(stat))
    .map(({ entry }) => {
      const value = clamp(Number(entry.value) || 0, 0, Number(entry.max ?? 20) - score);
      score += value;
      return { source: entry.note || 'Class Feature', value };
    })
    .filter((bonus) => bonus.value > 0);
}

// The bonuses on top of the base score, by source, for the builder's breakdown.
export function abilityScoreBonuses(character, stat) {
  const bonuses = [];
  const background = backgroundAbilityBonus(character, stat);
  if (background) bonuses.push({ source: 'Background', value: background });
  const beforeFeats = baseAbilityScore(character, stat) + background;
  const feats = getFeatAsiBonus(character, stat, beforeFeats);
  if (feats) bonuses.push({ source: 'Feat/ASI', value: feats });
  bonuses.push(...featureAbilityBonuses(character, stat, beforeFeats + feats));
  return bonuses;
}

// The score the character was built with: base, background, feats/ASI and
// class features.
export function builtAbilityScore(character, stat) {
  return abilityScoreBonuses(character, stat)
    .reduce((sum, bonus) => sum + bonus.value, baseAbilityScore(character, stat));
}

// The score in play. `ignoreWildShape` gives your own score while transformed
// (Hit Points are kept from your own Constitution). No character at all reads
// as a plain 10.
export function abilityScore(character, stat, { ignoreWildShape = false } = {}) {
  if (!character) return 10;
  const key = String(stat || '').toLowerCase();
  if (!ignoreWildShape) {
    const formScore = wildShapeAbilityScore(character, key);
    if (formScore != null) return formScore;
  }
  return getFinalAbilityScore(character, key, builtAbilityScore(character, key), { ignoreWildShape });
}

export function abilityScores(character, options) {
  return Object.fromEntries(ABILITIES.map((stat) => [stat, abilityScore(character, stat, options)]));
}

export function builtAbilityScores(character) {
  return Object.fromEntries(ABILITIES.map((stat) => [stat, builtAbilityScore(character, stat)]));
}

// The modifier of the score in play, as AC, Hit Points, scaling formulas and
// adapters read it.
export function finalAbilityModifier(character, ability, options) {
  return abilityModifier(abilityScore(character, ability, options));
}
