import { parseFormula } from './dice.js';
import { UI_COLORS, normalizeHexColor } from '../../ui/colors.js';
import { COMBAT_LABEL_SHAPES } from '../../encounter/combatLabels.js';

// The result and the roller have separate meanings: critical d20 outcomes
// colour the result; the character icon/monster marker colours the author.
export const ROLL_LOG_COLORS = Object.freeze({
  normal: 'text.primary',
  nat20: UI_COLORS.accentText,
  nat1: UI_COLORS.danger,
});

export function rollOutcome(entry) {
  const dice = Array.isArray(entry?.rolls) ? entry.rolls : [];
  const d20s = dice.filter((die) => die.faces === 20 && die.kept !== false);
  const kept = d20s.find((die) => die.kept === true) || (d20s.length === 1 ? d20s[0] : null);
  const natural = kept?.v;
  const kind = natural === 20 ? 'nat20' : natural === 1 ? 'nat1' : 'normal';
  return { kind, color: ROLL_LOG_COLORS[kind], isCrit: kind === 'nat20', isFail: kind === 'nat1' };
}

export function rollLogDieColor(die) {
  return die.kept === false ? ROLL_LOG_COLORS.normal : rollOutcome({ rolls: [die] }).color;
}

export function normalizeRollIdentity(entry) {
  return {
    actorColor: normalizeHexColor(entry?.actorColor),
    actorShape: COMBAT_LABEL_SHAPES.includes(entry?.actorShape) ? entry.actorShape : null,
    actorLabel: typeof entry?.actorLabel === 'string' ? entry.actorLabel.slice(0, 3) : '',
  };
}

// A roll's formula ("1d10 [5] + 3" or "2d4+3", the values in brackets or not)
// laid out as the formula once and one visual calculation.
export function rollLogCalculation(entry) {
  const detail = String(entry.detail ?? '').trim();
  const dice = Array.isArray(entry.rolls) ? entry.rolls : [];
  const total = entry.total;
  const source = detail.replace(/^(?:Advantage|Disadvantage):[^;]*;\s*/i, '')
    .replace(/\[[^\]]*\]|\(\s*\d+\s*\)/g, '').split('=')[0].replace(/\s+/g, '');
  const parsed = parseFormula(source);
  const matched = parsed.valid && parsed.dice.length === dice.length
    && parsed.dice.every((die, index) => die.faces === dice[index].faces);
  const mode = entry.meta?.mode ?? entry.mode
    ?? (/^Advantage:/i.test(detail) ? 'advantage' : /^Disadvantage:/i.test(detail) ? 'disadvantage' : null);
  const signedDice = dice.map((die, index) => ({ ...die, sign: matched ? parsed.dice[index].sign : 1 }));
  const sum = signedDice.filter((die) => die.kept !== false).reduce((value, die) => value + die.sign * die.v, 0);
  const bonus = entry.meta?.bonus ?? entry.bonus;
  const modifier = matched ? parsed.modifier : Number.isFinite(bonus) ? bonus
    : total != null && total !== '' && Number.isFinite(Number(total)) && dice.length ? Number(total) - sum : 0;
  return {
    dice: signedDice,
    modifier,
    total: total === '' ? null : total,
    formula: dice.length && parsed.valid ? source.replace(/([+-])/g, ' $1 ').trim() : detail,
    modeLabel: mode === 'advantage' ? 'ADV' : mode === 'disadvantage' ? 'DIS' : null,
  };
}
