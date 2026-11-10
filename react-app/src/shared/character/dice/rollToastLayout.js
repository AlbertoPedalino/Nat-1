import { isCriticalD20 } from './dice.js';
import { signed } from '../../ui/numberFormat.js';
import { UI_COLORS, uiAlpha, OPACITY } from '../../ui/colors.js';
// How a roll is laid out for a reader: which die was kept, what was added, what
// colour the total wears, whether it was a natural 20 or a natural 1.
//
// Shared because the same roll is shown in two places — the toast on the
// character sheet and the bubble over that character's piece on the battle map —
// and they have to agree. Dependency-free so the plain node runner can cover it.

export const ROLL_MODE_CHIP = {
  advantage: { label: 'ADV', color: UI_COLORS.success, borderColor: uiAlpha(UI_COLORS.success, OPACITY.strong), bgColor: uiAlpha(UI_COLORS.success, OPACITY.fill) },
  disadvantage: { label: 'DIS', color: UI_COLORS.warning, borderColor: uiAlpha(UI_COLORS.warning, OPACITY.strong), bgColor: uiAlpha(UI_COLORS.warning, OPACITY.fill) },
};

export function rollDieColor(value, faces) {
  // A coin has no good side and no bad one. Heads is 1, and colouring it like a
  // fumbled roll made the head come up red.
  if ((faces || 20) <= 2) return 'text.primary';
  if (value >= (faces || 20)) return UI_COLORS.accentText;
  if (value <= 1) return UI_COLORS.danger;
  return 'text.primary';
}

export function resolveToastLayout(toast) {
  const rolls = toast?.rolls || [];
  const d20s = rolls.filter((r) => r.faces === 20);
  const keptD20 = d20s.find((r) => r.kept) || d20s[0];

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
  let totalColor = 'text.primary';
  if (isCrit) totalColor = UI_COLORS.accentText;
  else if (isFail) totalColor = UI_COLORS.danger;

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
    total: toast?.total != null && toast?.total !== '' ? toast.total : null,
    totalColor,
  };
}
