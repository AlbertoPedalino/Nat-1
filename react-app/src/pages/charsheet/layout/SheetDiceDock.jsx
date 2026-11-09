import { useEffect } from 'react';
import { Box } from '@mui/material';
import DiceControl from '../../../shared/character/dice/DiceControl.jsx';
import { UI_COLORS, uiAlpha } from '../../../shared/ui/colors.js';
import { sheetColumnSx } from './layout.js';
import { useIsPhone } from '../../../shared/ui/useIsPhone.js';

// The sheet's dice, always at hand: the shared DiceControl floating at the
// bottom of the sheet, centred on every screen, so a roll never needs a scroll
// back to the top. On a phone it is a compact pill of two icons in solid gold:
// small enough to cover little, bright enough to be found without looking for
// it. From a tablet up, the labelled control.
//
// Sticky to the sheet, not fixed to the window: it rides the bottom edge of
// whatever scrolls the sheet (the page, or the panel an embedded sheet sits
// in) and, at the end of the sheet, settles into its own row after the last
// panel, so nothing is left under it. Only the pill takes clicks; the band
// around it lets them through.
export default function SheetDiceDock({
  embedded, rollLog, onRoll, onClearLog,
}) {
  const phone = useIsPhone();

  // Chrome on Android stretches the page when a scroll runs into its end, and
  // the dock on the bottom edge stretches with it. The sheet's own page turns
  // that effect off while it is open; an embedded sheet's panel does the same
  // for itself (FloatingSheetPanel).
  useEffect(() => {
    if (embedded) return undefined;
    const root = document.documentElement;
    const previous = root.style.overscrollBehaviorY;
    root.style.overscrollBehaviorY = 'none';
    return () => { root.style.overscrollBehaviorY = previous; };
  }, [embedded]);

  return (
    <Box sx={embedded ? embeddedDockSx : pageDockSx}>
      <DiceControl
        log={rollLog}
        onRoll={onRoll}
        onClear={onClearLog}
        variant={phone ? 'icon' : 'text'}
        emptyText="No rolls yet. Make an ability check, save, or attack to see it here."
        placement="up"
        surface={phone ? phoneSurface : undefined}
        sx={phone ? phonePillSx : labelledPillSx}
      />
    </Box>
  );
}

// The band sits on the bottom edge and carries the space under the pill
// itself (well clear of the edge, so the pill does not get lost there; more on
// a desktop). Being the last thing in the sheet, its place while scrolling and
// its place at the end are the same: nothing jumps, and at the end it has its
// own room below the last panel.
const dockSx = {
  position: 'sticky',
  bottom: 0,
  zIndex: 5,
  display: 'flex',
  pt: 1.5,
  pb: {
    xs: 'calc(24px + env(safe-area-inset-bottom, 0px))',
    md: 'calc(40px + env(safe-area-inset-bottom, 0px))',
  },
  pointerEvents: 'none',
  '& > *': { pointerEvents: 'auto' },
};

// Centred in the sheet's own column, or in the panel an embedded sheet sits in.
const embeddedDockSx = { ...dockSx, justifyContent: 'center' };
const pageDockSx = { ...dockSx, ...sheetColumnSx(false), justifyContent: 'center' };

// Floating over the sheet.
const floatingSx = { boxShadow: `0 6px 20px ${uiAlpha(UI_COLORS.black, 0.55)}` };

// The phone's pill: solid gold with dark icons and a faint gold halo, the one
// bright thing at the bottom of a dark sheet; a touch larger to tap.
const phoneSurface = {
  groupSx: { bgcolor: 'primary.main', borderColor: 'primary.main' },
  segmentSx: {
    color: 'primary.contrastText',
    px: 1.4,
    py: 0.85,
    '&:hover': { bgcolor: uiAlpha(UI_COLORS.black, 0.12) },
  },
  dividerColor: uiAlpha(UI_COLORS.black, 0.3),
};

const phonePillSx = {
  boxShadow: `0 6px 20px ${uiAlpha(UI_COLORS.black, 0.55)}, 0 0 0 4px ${uiAlpha(UI_COLORS.gold, 0.18)}`,
};

// The labelled control made into the same pill.
const labelledPillSx = {
  ...floatingSx,
  bgcolor: 'background.paper',
  borderRadius: 999,
  '& .MuiButton-root': { px: 2, py: 0.6 },
  '& .MuiButtonGroup-firstButton': { borderTopLeftRadius: 999, borderBottomLeftRadius: 999 },
  '& .MuiButtonGroup-lastButton': { borderTopRightRadius: 999, borderBottomRightRadius: 999 },
};
