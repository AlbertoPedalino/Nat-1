import { Box, Button, ButtonGroup } from '@mui/material';
import { Moon, Sun } from 'lucide-react';
import { phoneHiddenLabelSx } from '../../../shared/ui/iconOnlyOnPhone.js';
import { actionButtonTextSx } from '../../../shared/ui/actionButton.js';

// The header's actions: resting, which changes the character (Hit Dice, hit
// points, resources). The dice float at the bottom of the sheet instead
// (SheetDiceDock), within reach wherever the sheet is scrolled. On a phone and
// in an embedded sheet the group takes the width.
export default function SheetActions({
  readOnly, embedded, onShortRest, onLongRest,
}) {
  if (readOnly) return null;
  const groupSx = { flex: embedded ? 1 : { xs: 1, sm: 'none' } };
  return (
    <Box sx={{
      display: 'flex', gap: 1, flexShrink: 0, justifySelf: 'end', width: embedded ? '100%' : { xs: '100%', sm: 'auto' },
    }}>
      <ButtonGroup size="small" variant="outlined" aria-label="Rest" sx={groupSx}>
        <Button color="warning" startIcon={<Sun size={14} />} onClick={onShortRest} aria-label="Short rest" sx={actionButtonTextSx}>
          Short<Box component="span" sx={phoneHiddenLabelSx}>&nbsp;rest</Box>
        </Button>
        <Button color="info" startIcon={<Moon size={14} />} onClick={onLongRest} aria-label="Long rest" sx={actionButtonTextSx}>
          Long<Box component="span" sx={phoneHiddenLabelSx}>&nbsp;rest</Box>
        </Button>
      </ButtonGroup>
    </Box>
  );
}

