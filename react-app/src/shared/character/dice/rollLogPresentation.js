import { parseFormula } from './dice.js';
import { UI_COLORS } from '../../ui/colors.js';

// The result and the roller have separate meanings: critical d20 outcomes
// colour the result; the character icon/monster marker colours the author.
export const ROLL_LOG_COLORS = Object.freeze({
  normal: 'text.primary',
  nat20: UI_COLORS.goldLight,
  nat1: UI_COLORS.danger,
});

export function rollOutcome(entry) {
  const dice = Array.isArray(entry?.rolls) ? entry.rolls : [];
  const d20s = dice.filter((die) => die.faces === 20 && die.kept !== false);
  const kept = d20s.find((die) => die.kept === true) || (d20s.length === 1 ? d20s[0] : null);
  const natural = kept?.v ?? (!dice.length ? entry?.naturalD20 : null);
  const legacy = !dice.length && natural == null ? entry?.cls : null;
  const kind = natural === 20 || legacy === 'nat20' ? 'nat20'
    : natural === 1 || legacy === 'nat1' ? 'nat1' : 'normal';
  return { kind, color: ROLL_LOG_COLORS[kind], isCrit: kind === 'nat20', isFail: kind === 'nat1' };
}

export function rollLogDieColor(die) {
  return die.kept === false ? ROLL_LOG_COLORS.normal : rollOutcome({ rolls: [die] }).color;
}

export function normalizeRollIdentity(entry) {
  const color = typeof entry?.actorColor === 'string' ? entry.actorColor.trim() : '';
  return {
    actorColor: /^#[0-9a-f]{6}$/i.test(color) ? color.toLowerCase() : null,
    actorShape: ['■', '●', '⬟', '⬢', '▲', '◆', '★', '◉', '▼', '◈'].includes(entry?.actorShape) ? entry.actorShape : null,
    actorLabel: typeof entry?.actorLabel === 'string' ? entry.actorLabel.slice(0, 3) : '',
  };
}

// Old encounter entries embed values in the formula; sheet entries carry them
// separately. Display both as a formula followed by one visual calculation.
export function rollLogCalculation(entry) {
  const detail = String(entry.detail ?? entry.mathStr ?? '').trim();
  const dice = Array.isArray(entry.rolls) ? entry.rolls : [];
  const total = entry.total ?? entry.result;
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
