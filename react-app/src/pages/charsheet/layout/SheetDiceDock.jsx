import { useEffect } from 'react';
import { Box, Button, useMediaQuery, useTheme } from '@mui/material';
import { ChevronRight, Dices } from 'lucide-react';
import DiceControl from '../../../shared/character/dice/DiceControl.jsx';
import { useStoredFlag } from '../../../shared/ui/useStoredFlag.js';
import { actionButtonToneSx } from '../../../shared/ui/actionButton.js';
import { UI_COLORS, uiAlpha } from '../../../shared/ui/colors.js';
import { sheetColumnSx } from './layout.js';

// Tucked away or out is this player's own choice on this device (a phone).
const HIDDEN_KEY = 'gb:sheet:dice-dock-hidden';

// The sheet's dice, always at hand: the shared DiceControl floating at the
// bottom of the sheet, so a roll never needs a scroll back to the top.
// Centred on a phone or tablet; on a desktop at the left, clear of the toasts
// in the bottom right, and out in the empty margin beside the sheet when the
// screen leaves room for it.
//
// Sticky to the sheet, not fixed to the window: it rides the bottom edge of
// whatever scrolls the sheet (the page, or the panel an embedded sheet sits
// in) and, at the end of the sheet, settles into its own row after the last
// panel, so nothing is left under it. Only the pill takes clicks; the band
// around it lets them through.
//
// On a phone, where it passes over most of the sheet, its chevron tucks it
// away into a half-round handle on the left edge, which brings it back. The
// handle stays well above the bottom edge: a browser whose toolbar sits at the
// bottom (Brave) keeps the first tap down there to bring the toolbar back.
// From a tablet up there is room for it, and it is always out.
export default function SheetDiceDock({
  embedded, rollLog, onRoll, onClearLog,
}) {
  const phone = useMediaQuery(useTheme().breakpoints.down('sm'), { noSsr: true });
  const [storedHidden, setHidden] = useStoredFlag(HIDDEN_KEY);
  const hidden = phone && storedHidden;

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
    <Box sx={[embedded ? embeddedDockSx : pageDockSx, hidden ? tuckedSx : null]}>
      {hidden ? (
        <Button size="small" variant="outlined" aria-label="Show dice" onClick={() => setHidden(false)} sx={[tabSx, actionButtonToneSx(UI_COLORS.goldLight), solidOnHoverSx]}>
          <Dices size={15} />
          <ChevronRight size={12} />
        </Button>
      ) : (
        <DiceControl
          log={rollLog}
          onRoll={onRoll}
          onClear={onClearLog}
          onHide={phone ? () => setHidden(true) : null}
          emptyText="No rolls yet. Make an ability check, save, or attack to see it here."
          placement="up"
          sx={pillSx}
        />
      )}
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

// An embedded sheet centres it in its panel, whatever the screen.
const embeddedDockSx = { ...dockSx, justifyContent: 'center' };

// On its own page: centred below a desktop, at the left of the sheet's column
// on one, and out in the margin left of the column where that margin holds it.
const SIDE_MARGIN_FITS = '@media (min-width: 1680px)';
const pageDockSx = {
  ...dockSx,
  ...sheetColumnSx(false),
  justifyContent: { xs: 'center', md: 'flex-start' },
  [SIDE_MARGIN_FITS]: { maxWidth: 'none', mx: 0, px: 3 },
};

// Tucked away, the band takes no room at all; the handle hangs off it.
const tuckedSx = { pt: 0, pb: { xs: 0, md: 0 } };

const pillSx = {
  bgcolor: 'background.paper',
  borderRadius: 999,
  boxShadow: `0 6px 20px ${uiAlpha(UI_COLORS.black, 0.55)}`,
  // A little smaller on a phone, where it passes over more of the sheet.
  '& .MuiButton-root': {
    px: { xs: 1.25, sm: 2 },
    py: { xs: 0.35, sm: 0.6 },
    fontSize: { xs: '0.58rem', sm: '0.625rem' },
    '& .MuiButton-startIcon': { mr: { xs: 0.5, sm: 1 } },
  },
  '& .MuiButtonGroup-firstButton': { borderTopLeftRadius: 999, borderBottomLeftRadius: 999 },
  '& .MuiButtonGroup-lastButton': { borderTopRightRadius: 999, borderBottomRightRadius: 999, px: { xs: 0.9, sm: 1.25 } },
};

// The band sits on the bottom of the visible sheet, so the handle is placed
// from there: on the left edge, about a fifth of the screen up.
const tabSx = {
  position: 'absolute',
  left: 0,
  bottom: '22vh',
  minWidth: 0,
  width: 40,
  height: 48,
  p: 0,
  pr: '4px',
  gap: '1px',
  bgcolor: 'background.paper',
  borderRadius: '0 24px 24px 0',
  borderLeft: 0,
  boxShadow: `4px 0 14px ${uiAlpha(UI_COLORS.black, 0.45)}`,
};

// MUI's hover tint would replace the handle's fill; it stays solid.
const solidOnHoverSx = { '&:hover': { bgcolor: 'background.paper' } };
