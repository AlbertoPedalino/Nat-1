// Pure dice utilities + roll-result formatters.
// Single source of truth for d20 tests and damage/heal/utility rolls so that
// spell, action, and ability roll popups stay consistent.

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
// modifier. Split out from rollFormula because dice thrown on the battle map are
// rolled by the throw itself — the formula has to say which dice to throw before
// anything decides what they show.
export function parseFormula(formula) {
  const clean = String(formula || '').replace(/\s+/g, '');
  const diceRe = /([+-]?)(\d*)d(\d+)|([+-]?\d+)/gi;
  const dice = [];
  let modifier = 0;
  let match;
  while ((match = diceRe.exec(clean))) {
    if (match[3]) {
      const sign = match[1] === '-' ? -1 : 1;
      const count = Number(match[2] || 1);
      const faces = Number(match[3]);
      for (let i = 0; i < count; i++) dice.push({ faces, sign });
    } else if (match[4]) {
      modifier += Number(match[4]);
    }
  }
  return { dice, modifier };
}

export function rollFormula(formula) {
  const { dice, modifier } = parseFormula(formula);
  let total = modifier;
  const rolls = [];
  for (const die of dice) {
    const v = rollDie(die.faces);
    rolls.push({ v, faces: die.faces });
    total += die.sign * v;
  }
  return { total, rolls };
}

// Standard toast title separator used by all roll popups.
const ROLL_TITLE_SEPARATOR = ' — ';

export function formatRollTitle(name, label) {
  if (!name) return label || '';
  if (!label) return name;
  return `${name}${ROLL_TITLE_SEPARATOR}${label}`;
}
