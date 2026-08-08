// Pure dice utilities + roll-result formatters.
// Single source of truth for d20 tests and damage/heal/utility rolls so that
// spell, action, and ability roll popups stay consistent.

export const DICE_LIMITS = Object.freeze({
  formulaLength: 120,
  minFaces: 2,
  maxFaces: 100,
  maxDice: 100,
  modifierAbs: 10000,
});

export function rollDie(faces) {
  return Math.floor(Math.random() * Math.max(1, Number(faces) || 1)) + 1;
}

function bonusText(bonus) {
  const b = Number(bonus) || 0;
  return b >= 0 ? `+${b}` : `${b}`;
}

export function rollD20(bonus, options = {}) {
  const b = Number(bonus) || 0;
  let mode = 'normal';
  if (options.advantage === true) mode = 'advantage';
  else if (options.advantage === false || options.disadvantage === true) mode = 'disadvantage';

  let kept;
  let rolls;
  if (mode === 'advantage') {
    const r1 = rollDie(20);
    const r2 = rollDie(20);
    kept = Math.max(r1, r2);
    rolls = [
      { v: r1, faces: 20, kept: r1 >= r2 },
      { v: r2, faces: 20, kept: r2 > r1 },
    ];
  } else if (mode === 'disadvantage') {
    const r1 = rollDie(20);
    const r2 = rollDie(20);
    kept = Math.min(r1, r2);
    rolls = [
      { v: r1, faces: 20, kept: r1 <= r2 },
      { v: r2, faces: 20, kept: r2 < r1 },
    ];
  } else {
    const r = rollDie(20);
    kept = r;
    rolls = [{ v: r, faces: 20, kept: true }];
  }

  const total = kept + b;
  return { mode, kept, bonus: b, total, rolls };
}

export function formatD20Detail(result) {
  const bt = bonusText(result.bonus);
  if (result.mode === 'advantage') return `Advantage: keep ${result.kept}; d20 ${bt} = ${result.total}`;
  if (result.mode === 'disadvantage') return `Disadvantage: keep ${result.kept}; d20 ${bt} = ${result.total}`;
  return `d20 ${bt} = ${result.total}`;
}

export function buildD20Meta(result) {
  const meta = { bonus: result.bonus, kept: result.kept };
  if (result.mode !== 'normal') meta.mode = result.mode;
  return meta;
}

// What a formula asks for, without rolling it: one entry per die, plus the flat
// modifier. The grammar is intentionally small and strict:
//   term ((+|-) term)*, where a term is an integer or [count]d<faces>.
//
// Strictness matters because some formulas arrive from imported bestiary data.
// The old scanning regex silently turned `2d6garbage999` into `2d6+999`.
// Invalid input now fails as one structured result and allocates no dice, while
// a valid pool is kept whole instead of being shortened for display purposes.
const FORMULA_RE = /^[+-]?(?:\d*d\d+|\d+)(?:[+-](?:\d*d\d+|\d+))*$/i;
const FORMULA_TERM_RE = /([+-]?)(?:(\d*)d(\d+)|(\d+))/gi;

function invalidFormula(code, message) {
  return {
    valid: false,
    error: { code, message },
    dice: [],
    modifier: 0,
  };
}

export function parseFormula(formula) {
  const source = String(formula ?? '');
  if (source.length > DICE_LIMITS.formulaLength) {
    return invalidFormula('FORMULA_TOO_LONG', `Formula exceeds ${DICE_LIMITS.formulaLength} characters.`);
  }

  const clean = source.replace(/\s+/g, '');
  if (!clean) return invalidFormula('EMPTY_FORMULA', 'Formula is empty.');
  if (!FORMULA_RE.test(clean)) {
    return invalidFormula('INVALID_SYNTAX', 'Formula contains unsupported or incomplete notation.');
  }

  const terms = [];
  let diceCount = 0;
  let modifier = 0;
  let match;
  FORMULA_TERM_RE.lastIndex = 0;
  while ((match = FORMULA_TERM_RE.exec(clean))) {
    const sign = match[1] === '-' ? -1 : 1;
    if (match[3]) {
      const count = Number(match[2] || 1);
      const faces = Number(match[3]);
      if (!Number.isSafeInteger(count) || count < 1) {
        return invalidFormula('INVALID_DIE_COUNT', 'Every dice term must contain at least one die.');
      }
      diceCount += count;
      if (!Number.isSafeInteger(diceCount) || diceCount > DICE_LIMITS.maxDice) {
        return invalidFormula(
          'DICE_COUNT_OUT_OF_RANGE',
          `A formula can contain at most ${DICE_LIMITS.maxDice} dice.`,
        );
      }
      if (!Number.isSafeInteger(faces)
          || faces < DICE_LIMITS.minFaces
          || faces > DICE_LIMITS.maxFaces) {
        return invalidFormula(
          'INVALID_DIE_FACES',
          `Dice must have between ${DICE_LIMITS.minFaces} and ${DICE_LIMITS.maxFaces} faces.`,
        );
      }
      terms.push({ count, faces, sign });
    } else {
      const value = Number(match[4]);
      if (!Number.isSafeInteger(value)) {
        return invalidFormula('INVALID_MODIFIER', 'Formula modifier must be a safe integer.');
      }
      modifier += sign * value;
      if (!Number.isSafeInteger(modifier) || Math.abs(modifier) > DICE_LIMITS.modifierAbs) {
        return invalidFormula(
          'MODIFIER_OUT_OF_RANGE',
          `Formula modifier must stay between -${DICE_LIMITS.modifierAbs} and ${DICE_LIMITS.modifierAbs}.`,
        );
      }
    }
  }

  const dice = [];
  for (const term of terms) {
    for (let index = 0; index < term.count; index += 1) {
      dice.push({ faces: term.faces, sign: term.sign });
    }
  }
  return { valid: true, error: null, dice, modifier };
}

export function rollFormula(formula) {
  const parsed = parseFormula(formula);
  if (!parsed.valid) return { valid: false, error: parsed.error, total: null, rolls: [] };

  const { dice, modifier } = parsed;
  let total = modifier;
  const rolls = [];
  for (const die of dice) {
    const v = rollDie(die.faces);
    rolls.push({ v, faces: die.faces });
    total += die.sign * v;
  }
  return { valid: true, error: null, total, rolls };
}

// Standard toast title separator used by all roll popups.
const ROLL_TITLE_SEPARATOR = ' — ';

export function formatRollTitle(name, label) {
  if (!name) return label || '';
  if (!label) return name;
  return `${name}${ROLL_TITLE_SEPARATOR}${label}`;
}
