import { Button, Tooltip } from '@mui/material';
import { Sword } from 'lucide-react';
import { effectiveD20Modifier } from '../../../shared/character/sheet/sheetStats.js';
import { inlineButtonSx } from '../spells/spellsTabStyles.js';
import { attackRollerToneSx } from '../../../shared/ui/entityColors.js';
import RollModeArea from '../../../shared/character/dice/RollModeArea.jsx';
import { sourcesFromAdvArg } from '../../../shared/character/dice/advantage.js';
import { signed } from '../../../shared/ui/numberFormat.js';
import { ICON_SIZES } from '../../../shared/ui/iconSizes.js';

// Single source for the "Hit +X" attack-roll button (weapon + spell). It both
// renders the modifier and fires the roll, so the two can never diverge: the
// shown number is Exhaustion-adjusted (effectiveD20Modifier) while the roll is
// handed the RAW bonus — rollD20 applies the same penalty — counting it once.
// Any new attack-roll surface uses this instead of hand-building the button, so
// it cannot forget the penalty.
// The tint is derived here from `disadv`/`notProficient` rather than passed in,
// so every attack surface shows the same color for the same roll state.
// Right-click / long press adds a one-off advantage or disadvantage source on
// top of `sources` (the unfolded state; derived from `advArg` when absent).
export default function AttackRollButton({
  rawBonus,
  exhaustionLevel = 0,
  label,
  advArg,
  sources,
  tag = '',
  tooltip = '',
  disadv = false,
  notProficient = false,
  critOn = 20,
  sx,
  onRoll,
}) {
  // The improved critical range travels with the roll only when there is one.
  const roll = (advantage) => (critOn < 20
    ? onRoll?.(rawBonus, label, advantage, { critOn })
    : onRoll?.(rawBonus, label, advantage));
  const button = (
    <RollModeArea
      component={Button}
      size="small"
      variant="outlined"
      sources={sources || sourcesFromAdvArg(advArg)}
      onPick={(picked) => roll(picked)}
      onClick={(e) => { e.stopPropagation(); roll(advArg); }}
      sx={{ ...inlineButtonSx, ...attackRollerToneSx({ disadv, notProficient }), ...sx }}
    >
      <Sword size={ICON_SIZES.xs} style={{ marginRight: 2 }} /> Hit {signed(effectiveD20Modifier(rawBonus, exhaustionLevel))}{tag}
    </RollModeArea>
  );
  return tooltip ? <Tooltip title={tooltip}>{button}</Tooltip> : button;
}
