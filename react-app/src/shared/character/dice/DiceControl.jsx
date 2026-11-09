import { useState } from 'react';
import {
  Box, Button, ButtonGroup, IconButton, Popover, Tooltip,
} from '@mui/material';
import { Dices, ScrollText } from 'lucide-react';
import CustomRollDialog from './CustomRollDialog.jsx';
import RollLogList from './RollLogList.jsx';
import { UI_COLORS, uiAlpha } from '../../ui/colors.js';
import { actionButtonTextSx } from '../../ui/actionButton.js';

// The dice on every screen that rolls (character sheet, battle map, encounter
// builder): one joined control, rolling first and the log second, so the roll
// is one click away and the log never stands in front of it. The dice half
// opens the custom roll picker (`onRoll(formula)`); the log half opens the
// roll log (RollLogList) in a popover under the control (`placement: 'up'`:
// above it, for a control docked at the bottom).
//
// `variant`: 'text' (labelled buttons) or 'icon' (a pill of two icons, for a
// corner of the map). `surface` restyles the pieces for a screen with its own
// chrome — the map, which is often fullscreen: { groupSx, segmentSx,
// dividerColor, paperSx, dialog } where `dialog` holds CustomRollDialog's
// style props. `settings` (the GM's GmRollsShownSwitch) is shown where the
// roll is made and on top of the log.
export default function DiceControl({
  log, onRoll, onClear, emptyText, variant = 'text', surface = {}, settings = null, placement = 'down', sx,
}) {
  const [anchor, setAnchor] = useState(null);
  const [rollerOpen, setRollerOpen] = useState(false);
  const count = log?.length || 0;
  const logLabel = `Roll log, ${count} ${count === 1 ? 'roll' : 'rolls'}`;
  const toggleLog = (event) => setAnchor(anchor ? null : event.currentTarget);
  const logProps = {
    'aria-label': logLabel, 'aria-haspopup': 'dialog', 'aria-expanded': anchor ? 'true' : undefined, onClick: toggleLog,
  };

  return (
    <>
      {variant === 'icon' ? (
        <Box role="group" aria-label="Dice" sx={[iconGroupSx, surface.groupSx, sx]}>
          <Tooltip title="Roll dice">
            <IconButton size="small" aria-label="Roll dice" onClick={() => setRollerOpen(true)} sx={[iconSegmentSx, surface.segmentSx]}>
              <Dices size={16} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Roll log">
            <IconButton size="small" {...logProps} sx={[iconSegmentSx, surface.segmentSx, dividerSx(surface.dividerColor), anchor ? openSx : null]}>
              <ScrollText size={16} />
            </IconButton>
          </Tooltip>
        </Box>
      ) : (
        <ButtonGroup size="small" variant="outlined" aria-label="Dice" sx={sx}>
          <Button startIcon={<Dices size={14} />} onClick={() => setRollerOpen(true)} sx={[actionButtonTextSx, toneSx(UI_COLORS.goldLight)]}>
            Roll
          </Button>
          <Button startIcon={<ScrollText size={14} />} {...logProps} sx={[actionButtonTextSx, toneSx(UI_COLORS.success), anchor ? openSx : null]}>
            Log{count ? ` · ${count}` : ''}
          </Button>
        </ButtonGroup>
      )}
      <Popover
        open={Boolean(anchor)}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={placement === 'up' ? { vertical: 'top', horizontal: 'center' } : { vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={placement === 'up' ? { vertical: 'bottom', horizontal: 'center' } : { vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { 'aria-label': 'Roll log', sx: { ...paperSx, ...(placement === 'up' ? { mt: 0, mb: 0.75 } : null), ...surface.paperSx } } }}
      >
        {settings ? <Box sx={settingsSx}>{settings}</Box> : null}
        <RollLogList log={log} onClear={onClear} emptyText={emptyText} />
      </Popover>
      <CustomRollDialog
        open={rollerOpen}
        onClose={() => setRollerOpen(false)}
        onRoll={onRoll}
        footer={settings}
        {...surface.dialog}
      />
    </>
  );
}

function toneSx(color) {
  return {
    color,
    borderColor: uiAlpha(color, 0.4),
    '&:hover': { borderColor: color, bgcolor: uiAlpha(color, 0.08) },
  };
}

const iconGroupSx = {
  display: 'inline-flex',
  alignItems: 'stretch',
  borderRadius: 999,
  overflow: 'hidden',
  border: 1,
  borderColor: 'divider',
  bgcolor: 'background.paper',
};

const iconSegmentSx = { borderRadius: 0, px: 0.9 };

// The rule between the two halves, on the log half itself: a rule set from the
// group would lose to the buttons' own `border: 0`.
function dividerSx(color = 'divider') {
  return { borderLeft: '1px solid', borderLeftColor: color };
}

// The half whose popover is open is lit.
const openSx = { bgcolor: uiAlpha(UI_COLORS.gold, 0.16) };

const settingsSx = { pb: 1, mb: 1, borderBottom: 1, borderColor: 'divider' };

const paperSx = {
  mt: 0.75,
  p: 1.25,
  width: { xs: 'calc(100vw - 32px)', sm: 340 },
  maxHeight: '60vh',
  overflowY: 'auto',
};
