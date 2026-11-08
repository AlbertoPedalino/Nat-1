import { Box, Button, ButtonGroup } from '@mui/material';
import { Moon, Sun } from 'lucide-react';
import DiceControl from '../../../shared/character/dice/DiceControl.jsx';
import { UI_FONTS } from '../../../shared/ui/fonts.js';
import { phoneHiddenLabelSx } from '../../../shared/ui/iconOnlyOnPhone.js';

// The sheet's two kinds of action, kept apart: resting changes the character
// (Hit Dice, hit points, resources), the dice (DiceControl, as on every screen)
// change nothing. On a phone, and in an embedded sheet, the two groups share
// the width; from a tablet up they sit side by side at their own size.
export default function SheetActions({
  readOnly, embedded, rollLog, onShortRest, onLongRest, onRoll, onClearLog,
}) {
  const groupSx = { flex: embedded ? 1 : { xs: 1, sm: 'none' } };
  return (
    <Box sx={{
      display: 'flex', gap: 1, flexShrink: 0, justifySelf: 'end', width: embedded ? '100%' : { xs: '100%', sm: 'auto' },
    }}>
      {!readOnly ? (
        <ButtonGroup size="small" variant="outlined" aria-label="Rest" sx={groupSx}>
          <Button color="warning" startIcon={<Sun size={14} />} onClick={onShortRest} aria-label="Short rest" sx={restSx}>
            Short<Box component="span" sx={phoneHiddenLabelSx}>&nbsp;rest</Box>
          </Button>
          <Button color="info" startIcon={<Moon size={14} />} onClick={onLongRest} aria-label="Long rest" sx={restSx}>
            Long<Box component="span" sx={phoneHiddenLabelSx}>&nbsp;rest</Box>
          </Button>
        </ButtonGroup>
      ) : null}
      <DiceControl
        log={rollLog}
        onRoll={onRoll}
        onClear={onClearLog}
        emptyText="No rolls yet. Make an ability check, save, or attack to see it here."
        sx={groupSx}
      />
    </Box>
  );
}

const restSx = {
  flex: 1,
  whiteSpace: 'nowrap',
  fontFamily: UI_FONTS.display,
  fontSize: '0.625rem',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
};
