// The result and the roller have separate meanings: critical d20 outcomes
// colour the result; the character icon/monster marker colours the author.
export const ROLL_LOG_COLORS = Object.freeze({
  normal: 'text.primary',
  nat20: '#edd48a',
  nat1: '#de675f',
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
