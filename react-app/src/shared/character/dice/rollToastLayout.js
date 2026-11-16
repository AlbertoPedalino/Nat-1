import { isCriticalD20 } from './dice.js';
import { signed } from '../../ui/numberFormat.js';
import { UI_COLORS } from '../../ui/colors.js';
import { ROLL_KIND_TONES } from '../../ui/entityColors.js';
import { ROLL_LOG_COLORS, naturalD20 } from './rollLogPresentation.js';
// How a roll is laid out for a reader: which die was kept, what was added, what
// colour the total wears, whether it was a natural 20 or a natural 1.
//
// Shared because the same roll is shown in two places — the toast on the
// character sheet and the bubble over that character's piece on the battle map —
// and they have to agree. Dependency-free so the plain node runner can cover it.

// How the roll was made, stuck on the toast: filled in its tone, the
// strongest fact on it after the total. The same words and colours wherever
// a mode is shown or chosen (the launch's initiative keys take `color`, the
// palette name of `tone`).
export const ROLL_MODE_CHIP = {
  advantage: { label: 'ADV', tone: UI_COLORS.success, color: 'success' },
  disadvantage: { label: 'DIS', tone: UI_COLORS.warning, color: 'warning' },
};

// A die's result on its face, in the roll log's colours (ROLL_LOG_COLORS):
// its highest face as a natural 20, its 1 as a natural 1.
export function rollDieColor(value, faces) {
  // A coin has no good side and no bad one. Heads is 1, and colouring it like a
  // fumbled roll made the head come up red.
  if ((faces || 20) <= 2) return ROLL_LOG_COLORS.normal;
  if (value >= (faces || 20)) return ROLL_LOG_COLORS.nat20;
  if (value <= 1) return ROLL_LOG_COLORS.nat1;
  return ROLL_LOG_COLORS.normal;
}

export function resolveToastLayout(toast) {
  const rolls = toast?.rolls || [];
  const d20s = rolls.filter((r) => r.faces === 20);
  // A natural 20 or 1 only where one d20 is the roll (naturalD20).
  const keptD20 = naturalD20(rolls);

  const mode = toast?.meta?.mode;
  const bonus = toast?.meta?.bonus;
  const hasBonus = Number.isFinite(bonus) && bonus !== 0;
  // Current formula rolls carry their already-combined flat modifier in
  // meta.bonus. For older saved/shared rolls, read a trailing modifier from
  // the formula detail as a fallback.
  const formulaMod = d20s.length === 0 && rolls.length > 0
    ? String(toast?.detail || '').replace(/\s+/g, '').match(/([+-]\d+)$/)?.[1] || null
    : null;

  const modifier = hasBonus
    ? signed(bonus)
    : (formulaMod && Number(formulaMod) !== 0 ? formulaMod : null);

  const isCrit = keptD20 ? isCriticalD20(keptD20.v, toast?.meta) : false;
  const isFail = keptD20?.v <= 1;
  // The roll's colour, by its kind (null: neutral). A natural 20 or 1 keeps
  // its own colours over it.
  const tone = ROLL_KIND_TONES[toast?.meta?.kind] || null;
  let totalColor = tone || ROLL_LOG_COLORS.normal;
  if (isCrit) totalColor = ROLL_LOG_COLORS.nat20;
  else if (isFail) totalColor = ROLL_LOG_COLORS.nat1;
  const modifierColor = modifier ? (String(modifier).startsWith('-') || String(modifier).startsWith('−') ? UI_COLORS.dangerText : UI_COLORS.successText) : null;

  return {
    label: toast?.label,
    detail: toast?.detail || null,
    modeChip: ROLL_MODE_CHIP[mode] || null,
    isCrit: Boolean(isCrit),
    isFail: Boolean(isFail),
    dice: rolls.map((r) => ({
      value: r.v,
      faces: r.faces,
      color: rollDieColor(r.v, r.faces),
      dimmed: r.kept === false,
    })),
    modifier,
    modifierColor,
    total: toast?.total != null && toast?.total !== '' ? toast.total : null,
    totalColor,
    tone,
  };
}
