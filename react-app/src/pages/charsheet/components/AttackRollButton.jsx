import { Button, Tooltip } from '@mui/material';
import { Sword } from 'lucide-react';
import { fbonus, effectiveD20Modifier } from '../logic/calculations.js';
import { inlineButtonSx } from './spellsTabStyles.js';

// Single source for the "Hit +X" attack-roll button (weapon + spell). It both
// renders the modifier and fires the roll, so the two can never diverge: the
// shown number is Exhaustion-adjusted (effectiveD20Modifier) while the roll is
// handed the RAW bonus — rollD20 applies the same penalty — counting it once.
// Any new attack-roll surface uses this instead of hand-building the button, so
// it cannot forget the penalty.
export default function AttackRollButton({ rawBonus, exhaustionLevel = 0, label, advArg, tag = '', tooltip = '', sx, onRoll }) {
  const button = (
    <Button
      size="small"
      variant="outlined"
      onClick={(e) => { e.stopPropagation(); onRoll?.(rawBonus, label, advArg); }}
      sx={{ ...inlineButtonSx, ...sx }}
    >
      <Sword size={12} style={{ marginRight: 2 }} /> Hit {fbonus(effectiveD20Modifier(rawBonus, exhaustionLevel))}{tag}
    </Button>
  );
  return tooltip ? <Tooltip title={tooltip}>{button}</Tooltip> : button;
}
