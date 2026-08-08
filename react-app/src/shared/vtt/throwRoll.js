// Rolling a formula by throwing the dice.
//
// Everywhere else in the app a roll is a random number that dice are then drawn
// around. Here it is the other way round: the formula says which solids to
// throw, the throw is simulated, and the faces left looking at the reader are
// the result. Nothing can disagree with the table, because the table is what
// decided.
//
// Seeded from the roll's id, so the total published to everyone else is the one
// their own copy of the throw comes to.

import { faceLabel, faceNumbering } from '../character/dice3d.js';
import { parseFormula } from '../character/dice.js';
import { dieGeometry } from '../character/polyhedra.js';
import { simulateThrow, thrownDieSize } from './dicePhysics.js';

export function throwFormula(formula, seed, options = {}) {
  const parsed = parseFormula(formula);
  if (!parsed.valid) return null;
  const { dice, modifier } = parsed;
  if (!dice.length) return null;

  const physicsOptions = {
    ...options,
    size: options.size ?? thrownDieSize(dice.length),
  };
  const { results } = simulateThrow(dice, seed, physicsOptions);

  let total = modifier;
  const rolls = dice.map((die, index) => {
    const faces = dieGeometry(die.faces).faces.length;
    const numbering = faceNumbering(faces, die.faces, `${seed}:${index}`);
    const value = numbering[results[index]];
    total += die.sign * value;
    return { v: value, faces: die.faces };
  });

  const notes = [];
  // A coin that came up 1 came up heads, and the line under the roll should say
  // so — the number is only there to be added up.
  const coins = rolls.filter((die) => die.faces === 2).map((die) => faceLabel(2, die.v));
  if (coins.length) notes.push(coins.join(', '));

  return {
    total,
    rolls,
    modifier,
    detail: notes.length ? `${formula} (${notes.join('; ')})` : formula,
  };
}
