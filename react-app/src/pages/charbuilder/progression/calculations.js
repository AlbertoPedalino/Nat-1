import { PB_COST } from '../constants.js';
import { ABILITIES } from '../../../shared/content/rulesVocabulary.js';

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


