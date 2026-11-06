import { parseFormula, rollD20, rollPool } from './dice.js';
import { signed } from '../../ui/numberFormat.js';

// A roll typed or clicked as notation — "2d6+3", or "+5" for a d20 test — in
// the shape the roll logs, the dice toast and the battle map show: the total,
// the best possible total, the natural d20 when one die decides, the dice as
// text and a colour class. Used by the encounter builder, the compendium and
// creatures on the map. The dice themselves are rolled by dice.js.

// A dice formula rolled as written; null when it is not valid notation.
export function rollDiceFormula(formula, rng = Math.random) {
  const parsed = parseFormula(formula);
  if (!parsed.valid) return null;
  const parts = [];
  let result = 0;
  let maxResult = 0;
  let dieCount = 0;
  let naturalD20 = null;
  for (const term of parsed.terms) {
    if (term.flat != null) {
      const value = term.flat;
      result += value;
      maxResult += value;
      const prefix = parts.length === 0 ? '' : (value < 0 ? ' - ' : ' + ');
      parts.push(`${prefix}${parts.length === 0 ? value : Math.abs(value)}`);
      continue;
    }
    const { count, faces, sign } = term;
    const values = rollPool(count, faces, rng);
    result += sign * values.reduce((sum, value) => sum + value, 0);
    maxResult += sign > 0 ? count * faces : -count;
    dieCount += count;
    if (count === 1 && faces === 20 && sign > 0) naturalD20 = values[0];
    const prefix = parts.length === 0 ? (sign < 0 ? '-' : '') : (sign < 0 ? ' - ' : ' + ');
    parts.push(`${prefix}${count}d${faces} [${values.join(', ')}]`);
  }
  if (!parts.length) return null;
  return {
    result,
    maxResult,
    naturalD20: dieCount === 1 ? naturalD20 : null,
    mathStr: parts.join(''),
  };
}

export function resultClass(result, maxResult, naturalD20 = null) {
  if (naturalD20 != null) {
    if (naturalD20 === 20) return 'nat20';
    if (naturalD20 === 1) return 'nat1';
  }
  return result >= maxResult * 0.75 ? 'high' : result >= maxResult * 0.4 ? 'mid' : 'low';
}

// `advantage`: true / false / undefined, as rollD20 takes it. It applies to a
// d20 test written as a bare modifier ("+5"); a dice formula is rolled as
// written.
export function rollDice(notation, type = 'Roll', rng = Math.random, { advantage } = {}) {
  const formula = String(notation || '').replace(/\s+/g, '').toLowerCase();
  if (!formula) return null;
  const rollResult = formula.startsWith('+') || formula.startsWith('-') || !formula.includes('d')
    ? rollModifier(formula, rng, advantage)
    : rollDiceFormula(formula, rng);
  if (!rollResult) return null;
  return {
    type,
    notation,
    ...rollResult,
    cls: resultClass(rollResult.result, rollResult.maxResult, rollResult.naturalD20),
  };
}

function rollModifier(formula, rng, advantage) {
  const mod = parseInt(formula, 10) || 0;
  const modText = signed(mod);
  const roll = rollD20(mod, { advantage, rng });
  if (roll.mode === 'normal') {
    return {
      result: roll.total,
      maxResult: 20 + mod,
      naturalD20: roll.kept,
      mathStr: `1d20 (${roll.kept}) ${modText}`,
    };
  }
  // Two d20s, the higher (advantage) or lower (disadvantage) kept; the dice
  // carry which one counted so toasts, the log and the map show both.
  const [first, second] = roll.rolls;
  return {
    result: roll.total,
    maxResult: 20 + mod,
    naturalD20: roll.kept,
    rolls: roll.rolls,
    bonus: mod,
    mode: roll.mode,
    mathStr: `${roll.mode === 'advantage' ? 'Advantage' : 'Disadvantage'}: 1d20 (${first.v}, ${second.v}) keep ${roll.kept} ${modText}`,
  };
}
