import { useState } from 'react';
import { Box, Popover } from '@mui/material';
import CustomRollDialog from './CustomRollDialog.jsx';
import RollLogList from './RollLogList.jsx';
import { UI_COLORS, OPACITY } from '../../ui/colors.js';
import { phoneHiddenLabelSx } from '../../ui/iconOnlyOnPhone.js';
import { TEXT_STYLES } from '../../ui/textStyles.js';
import { CONTROL_FONT_SIZES } from '../../ui/fonts.js';
import { SURFACES, tintedSurfaceSx, washImage } from '../../ui/surfaces.js';
import { ICON_SIZES } from '../../ui/iconSizes.js';
import { GAME_ICONS } from '../../ui/gameIcons.js';
import { LIST_ROW_RULE_SX } from '../../../shared/ui/interactive.js';
import { KEY_BAR_SX, PART_ICON_BUTTON_SX } from '../../ui/pressable.js';
import TipIconButton from '../../ui/TipIconButton.jsx';

// The dice on every screen that rolls (character sheet, battle map, encounter
// builder): one look everywhere, a pill of two keys — rolling first, the log
// second, so the roll is one click away and the log never stands in front of
// it. The dice key opens the custom roll picker (`onRoll(formula)`); the log
// key opens the roll log (RollLogList) in a popover (`placement: 'up'`: above
// it, for a control docked at the bottom).
//
// The pill is the accent gold (GOLD_SURFACE), the one bright thing at the
// bottom of a dark sheet. `labels` writes Roll and Log beside the icons from
// a tablet up (phoneHiddenLabelSx: a phone keeps the icons); a corner of the
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
  const keyLabel = (text) => (labels ? <Box component="span" sx={[phoneHiddenLabelSx, keyLabelSx]}>{text}</Box> : null);

  return (
    <>
      <Box role="group" aria-label="Dice" sx={[pillSx, surface.groupSx, sx]}>
        <TipIconButton title="Roll dice" size="small" onClick={() => setRollerOpen(true)} sx={[keySx, surface.segmentSx]}>
          <GAME_ICONS.roll size={ICON_SIZES.md} />
          {keyLabel('Roll')}
        </TipIconButton>
        <TipIconButton title="Roll log" size="small" {...logProps} sx={[keySx, surface.segmentSx, dividerSx(surface.dividerColor), anchor ? openSx : null]}>
          <GAME_ICONS.rollLog size={ICON_SIZES.md} />
          {keyLabel('Log')}
        </TipIconButton>
      </Box>
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

// The pill is one raised button, as a button group is.
const pillSx = {
  ...SURFACES.panel,
  ...KEY_BAR_SX,
  display: 'inline-flex',
  alignItems: 'stretch',
  borderRadius: 999,
  overflow: 'hidden',
};

// A key of the pill: the pill is the raised button, its keys lie in it.
const keySx = { ...PART_ICON_BUTTON_SX, borderRadius: 0, px: 1, gap: 0.75 };

// Roll / Log beside the icons: the controls' capitals.
const keyLabelSx = { ...TEXT_STYLES.label, fontSize: CONTROL_FONT_SIZES.normal };

// The pill everywhere but the map: filled with the accent, dark icons, inked
// edge; a touch larger to tap.
const GOLD_SURFACE = Object.freeze({
  groupSx: { bgcolor: 'primary.main' },
  segmentSx: {
    color: 'primary.contrastText',
    px: 1.5,
    py: 0.75,
    // Darkened over the pill's gold, not see-through.
    '&:hover': tintedSurfaceSx(UI_COLORS.black, { base: 'primary.main' }),
  },
});

// The rule between the two halves, on the log half itself: a rule set from the
// group would lose to the buttons' own `border: 0`.
function dividerSx(color = UI_COLORS.edge) {
  return { borderLeft: '2px solid', borderLeftColor: color };
}

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
