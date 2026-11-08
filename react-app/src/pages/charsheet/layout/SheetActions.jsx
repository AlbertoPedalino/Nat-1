import { Box, Button, ButtonGroup } from '@mui/material';
import { Dices, Moon, ScrollText, Sun } from 'lucide-react';
import { UI_COLORS, uiAlpha } from '../../../shared/ui/colors.js';
import { UI_FONTS } from '../../../shared/ui/fonts.js';
import { phoneHiddenLabelSx } from '../../../shared/ui/iconOnlyOnPhone.js';

// The sheet's two kinds of action, kept apart: resting changes the character
// (Hit Dice, hit points, resources), the dice are tools that change nothing.
// Each pair is one group. On a phone, and in an embedded sheet, the groups
// share the width; from a tablet up they sit side by side at their own size.
export default function SheetActions({
  readOnly, embedded, rollCount, onShortRest, onLongRest, onRoll, onOpenLog,
}) {
  const groupSx = { flex: embedded ? 1 : { xs: 1, sm: 'none' } };
  return (
    <Box sx={{ display: 'flex', gap: 1, width: embedded ? '100%' : { xs: '100%', sm: 'auto' }, flexShrink: 0 }}>
      {!readOnly ? (
        <ButtonGroup size="small" variant="outlined" aria-label="Rest" sx={groupSx}>
          <Button color="warning" startIcon={<Sun size={14} />} onClick={onShortRest} aria-label="Short rest" sx={buttonSx}>
            Short<Box component="span" sx={phoneHiddenLabelSx}>&nbsp;rest</Box>
          </Button>
          <Button color="info" startIcon={<Moon size={14} />} onClick={onLongRest} aria-label="Long rest" sx={buttonSx}>
            Long<Box component="span" sx={phoneHiddenLabelSx}>&nbsp;rest</Box>
          </Button>
        </ButtonGroup>
      ) : null}
      <ButtonGroup size="small" variant="outlined" aria-label="Dice" sx={groupSx}>
        <Button startIcon={<Dices size={14} />} onClick={onRoll} sx={{ ...buttonSx, ...toneSx(UI_COLORS.goldLight) }}>
          Roll
        </Button>
        <Button startIcon={<ScrollText size={14} />} onClick={onOpenLog} aria-label={`Roll log, ${rollCount} ${rollCount === 1 ? 'roll' : 'rolls'}`} sx={{ ...buttonSx, ...toneSx(UI_COLORS.success) }}>
          Log{rollCount ? ` · ${rollCount}` : ''}
        </Button>
      </ButtonGroup>
    </Box>
  );
}

const buttonSx = {
  flex: 1,
  whiteSpace: 'nowrap',
  fontFamily: UI_FONTS.display,
  fontSize: '0.625rem',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
};

function toneSx(color) {
  return {
    color,
    borderColor: uiAlpha(color, 0.4),
    '&:hover': { borderColor: color, bgcolor: uiAlpha(color, 0.08) },
  };
}
