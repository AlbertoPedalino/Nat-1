// How a roll is laid out for a reader: which die was kept, what was added, what
// colour the total wears, whether it was a natural 20 or a natural 1.
//
// Shared because the same roll is shown in two places — the toast on the
// character sheet and the bubble over that character's piece on the battle map —
// and they have to agree. Dependency-free so the plain node runner can cover it.

export const ROLL_MODE_CHIP = {
  advantage: { label: 'ADV', color: '#58b879', borderColor: 'rgba(88,184,121,0.55)', bgColor: 'rgba(88,184,121,0.14)' },
  disadvantage: { label: 'DIS', color: '#d69245', borderColor: 'rgba(214,146,69,0.55)', bgColor: 'rgba(214,146,69,0.14)' },
};

export function rollDieColor(value, faces) {
  // A coin has no good side and no bad one. Heads is 1, and colouring it like a
  // fumbled roll made the head come up red.
  if ((faces || 20) <= 2) return 'text.primary';
  if (value >= (faces || 20)) return '#edd48a';
  if (value <= 1) return '#de675f';
  return 'text.primary';
}

export function formatRollBonus(n) {
  const bonus = Number(n) || 0;
  return bonus >= 0 ? `+${bonus}` : `${bonus}`;
}

export function resolveToastLayout(toast) {
  const rolls = toast?.rolls || [];
  const d20s = rolls.filter((r) => r.faces === 20);
  const keptD20 = d20s.find((r) => r.kept) || d20s[0];

  const mode = toast?.meta?.mode;
  const bonus = toast?.meta?.bonus;
  const hasBonus = Number.isFinite(bonus);
  // Current formula rolls carry their already-combined flat modifier in
  // meta.bonus. For older saved/shared rolls, read a trailing modifier from
  // the formula detail as a fallback.
  const formulaMod = d20s.length === 0 && rolls.length > 0
    ? String(toast?.detail || '').replace(/\s+/g, '').match(/([+-]\d+)$/)?.[1] || null
    : null;

  const modifier = hasBonus ? formatRollBonus(bonus) : formulaMod;

  const isCrit = keptD20?.v >= 20;
  const isFail = keptD20?.v <= 1;
  let totalColor = 'text.primary';
  if (isCrit) totalColor = '#edd48a';
  else if (isFail) totalColor = '#de675f';

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
