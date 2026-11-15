import { useState } from 'react';
import { Box, Popover } from '@mui/material';
import CustomRollDialog from './CustomRollDialog.jsx';
import RollLogList from './RollLogList.jsx';
import { UI_COLORS, OPACITY } from '../../ui/colors.js';
import { washImage } from '../../ui/surfaces.js';
import { GAME_ICONS } from '../../ui/gameIcons.js';
import { LIST_ROW_RULE_SX } from '../../../shared/ui/interactive.js';
import KeyBar, { KEY_BAR_LOOKS } from '../../ui/KeyBar.jsx';

// The dice on every screen that rolls (character sheet, battle map, encounter
// builder): one look everywhere, a pill of two keys — rolling first, the log
// second, so the roll is one click away and the log never stands in front of
// it. The dice key opens the custom roll picker (`onRoll(formula)`); the log
// key opens the roll log (RollLogList) in a popover (`placement: 'up'`: above
// it, for a control docked at the bottom).
//
// The pill is the accent gold (GOLD_SURFACE), the one bright thing at the
// bottom of a dark sheet. `labels` writes Roll and Log beside the icons from
// a tablet up (KeyBar: a phone keeps the icons); a corner of the
// map passes `labels={false}`. `surface` restyles the pieces for a screen with
// its own chrome — the map, often fullscreen: { groupSx, segmentSx,
// dividerColor, paperSx, dialog } where `dialog` holds props for
// CustomRollDialog's SheetDialog (the map passes `surface: 'map'`).
// `settings` (the GM's GmRollsShownSwitch) is shown where the roll is made
// and on top of the log.
export default function DiceControl({
  log, onRoll, onClear, emptyText, labels = true, surface = GOLD_SURFACE, settings = null, placement = 'down', sx,
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
      <KeyBar
        label="Dice"
        look={surface}
        labels={labels}
        sx={sx}
        keys={[
          { id: 'roll', icon: GAME_ICONS.roll, label: 'Roll', title: 'Roll dice', onClick: () => setRollerOpen(true) },
          { id: 'log', icon: GAME_ICONS.rollLog, label: 'Log', title: 'Roll log', ...logProps, sx: anchor ? openSx : null },
        ]}
      />
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

// The pill everywhere but the map: the gold bar of keys (KeyBar).
const GOLD_SURFACE = KEY_BAR_LOOKS.gold;

// The half whose popover is open is lit: the wash laid over the button's own
// solid background (replacing it would let the page show through), and kept
// under the cursor.
const OPEN_WASH = washImage(UI_COLORS.accent, OPACITY.fill);
const openSx = { backgroundImage: OPEN_WASH, '&:hover': { backgroundImage: OPEN_WASH } };

const settingsSx = { pb: 1, mb: 1, ...LIST_ROW_RULE_SX };

const paperSx = {
  mt: 0.75,
  p: 1.25,
  width: { xs: 'calc(100vw - 32px)', sm: 340 },
  maxHeight: '60vh',
  overflowY: 'auto',
};
