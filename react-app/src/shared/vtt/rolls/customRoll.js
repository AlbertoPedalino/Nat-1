// A custom roll typed in the battle map's roller: rolled by the one dice
// engine like every other roll, then thrown in the dice tray, which paints each
// published value on the face that lands (DiceTray.jsx). The physics only
// animates; it never decides a number.

import { rollFormula } from '../../character/dice/dice.js';
import { faceLabel } from '../../character/dice/dice3d.js';

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
