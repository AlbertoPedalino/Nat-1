import { Button } from '@mui/material';
import { X } from 'lucide-react';
import { ICON_SIZES } from './iconSizes.js';
import { UI_COLORS } from './colors.js';
import { actionButtonToneSx } from './actionButton.js';
import { asArray } from '../lists.js';

// Every button that empties something and starts it over (the encounter
// panel, the filters, a combatant's conditions or effects, the roll log): an X
// and its label ("Clear", "Clear all"), outlined in the danger tone, small.
// Shown by its caller only while there is something to clear. Everything else
// (onClick, disabled, sx for placement) passes through.
export default function ClearButton({ children = 'Clear', ...props }) {
  return (
    <Button
      size="small"
      variant="outlined"
      startIcon={<X size={ICON_SIZES.xs} />}
      {...props}
      sx={[CLEAR_SX, ...asArray(props.sx)]}
    >
      {children}
    </Button>
  );
}

const CLEAR_SX = Object.freeze({ flex: '0 0 auto', ...actionButtonToneSx(UI_COLORS.dangerDeep) });
