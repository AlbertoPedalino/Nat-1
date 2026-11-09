import { useEffect } from 'react';
import { Box, Button } from '@mui/material';
import { ChevronUp, Dices } from 'lucide-react';
import DiceControl from '../../../shared/character/dice/DiceControl.jsx';
import { useStoredFlag } from '../../../shared/ui/useStoredFlag.js';
import { actionButtonTextSx, actionButtonToneSx } from '../../../shared/ui/actionButton.js';
import { UI_COLORS, uiAlpha } from '../../../shared/ui/colors.js';
import { sheetColumnSx } from './layout.js';

// Tucked away or out is this player's own choice on this device.
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
// around it lets them through. Its chevron tucks it away into a small handle
// sitting on the bottom edge, which brings it back.
export default function SheetDiceDock({
  embedded, rollLog, onRoll, onClearLog,
}) {
  const [hidden, setHidden] = useStoredFlag(HIDDEN_KEY);
  const show = () => setHidden(false);

  // Chrome on Android stretches the page when a scroll runs into its end, and
  // the handle on the bottom edge stretched with it. The sheet's own page turns
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
    <Box sx={[embedded ? embeddedDockSx : pageDockSx, hidden ? flushSx : null]}>
      {hidden ? (
        // Opens as the finger lifts, not on the click after it: a mobile browser
        // whose toolbar comes back at that tap (Brave) moves the page under the
        // finger and drops the click, but the lift still reaches the handle.
        // onClick stays for the keyboard; opening twice is the same as once.
        <Button size="small" variant="outlined" aria-label="Show dice" onPointerUp={show} onClick={show} sx={[tabSx, actionButtonToneSx(UI_COLORS.goldLight), solidOnHoverSx]}>
          <ChevronUp size={14} />
          <Dices size={14} />
        </Button>
      ) : (
        <DiceControl
          log={rollLog}
          onRoll={onRoll}
          onClear={onClearLog}
          onHide={() => setHidden(true)}
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

// Tucked away, the handle sits right on the bottom edge (its own padding keeps
// it above a phone's home indicator), not floating over the sheet.
const flushSx = { pb: { xs: 0, md: 0 } };

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

const tabSx = {
  ...actionButtonTextSx,
  flex: 'none',
  gap: 0.5,
  minWidth: 0,
  px: 2,
  pt: 0.5,
  pb: 'calc(4px + env(safe-area-inset-bottom, 0px))',
  bgcolor: 'background.paper',
  borderRadius: '10px 10px 0 0',
  borderBottom: 0,
  boxShadow: `0 -4px 14px ${uiAlpha(UI_COLORS.black, 0.45)}`,
};

// MUI's hover tint would replace the handle's fill; it stays solid.
const solidOnHoverSx = { '&:hover': { bgcolor: 'background.paper' } };
