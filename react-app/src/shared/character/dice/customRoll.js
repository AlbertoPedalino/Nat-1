// A roll from the custom roll picker (CustomRollDialog), on the sheet, the
// map or the encounter builder: rolled by the one dice engine like every other roll. On the map it is
// then thrown in the dice tray, which paints each published value on the face
// that lands (DiceTray.jsx); the physics only animates, never decides.

import { formatRollTitle, rollFormula } from './dice.js';
import { faceLabel } from './dice3d.js';

// null when the formula is not valid or has no dice to throw.
export function rollCustomFormula(formula, { rng } = {}) {
  const rolled = rollFormula(formula, { rng });
  if (!rolled.valid || !rolled.rolls.length) return null;
  // A coin that came up 1 came up heads, and the line under the roll should say
  // so — the number is only there to be added up.
  const coins = rolled.rolls.filter((die) => die.faces === 2).map((die) => faceLabel(2, die.v));
  return {
    total: rolled.total,
    rolls: rolled.rolls,
    modifier: rolled.modifier,
    detail: coins.length ? `${formula} (${coins.join(', ')})` : formula,
  };
}

// The same roll as the fields of a roll toast and log entry, which every
// screen then sends on its own way. null when there is nothing to roll.
export function customRollToast(formula, { rng } = {}) {
  const rolled = rollCustomFormula(formula, { rng });
  if (!rolled) return null;
  return {
    label: formatRollTitle('Custom Roll', formula),
    detail: rolled.detail,
    total: rolled.total,
    rolls: rolled.rolls,
    ...(rolled.modifier ? { meta: { bonus: rolled.modifier } } : {}),
  };
}
