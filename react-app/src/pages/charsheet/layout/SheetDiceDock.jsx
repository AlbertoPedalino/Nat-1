import { Box, Button } from '@mui/material';
import { ChevronUp, Dices } from 'lucide-react';
import DiceControl from '../../../shared/character/dice/DiceControl.jsx';
import { rollFormula, formatRollTitle } from '../../../shared/character/dice/dice.js';
import { useStoredFlag } from '../../../shared/ui/useStoredFlag.js';
import { actionButtonTextSx } from '../../../shared/ui/actionButton.js';
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
// around it lets them through. Its chevron tucks it away into a small tab in
// the same place, which brings it back.
export default function SheetDiceDock({
  embedded, rollLog, onClearLog, onShowToast,
}) {
  const [hidden, setHidden] = useStoredFlag(HIDDEN_KEY);
  return (
    <Box sx={embedded ? embeddedDockSx : pageDockSx}>
      {hidden ? (
        <Button size="small" variant="outlined" aria-label="Show dice" onClick={() => setHidden(false)} sx={tabSx}>
          <ChevronUp size={14} />
          <Dices size={14} />
        </Button>
      ) : (
        <DiceControl
          log={rollLog}
          onRoll={(formula) => {
            const { total, rolls } = rollFormula(formula);
            onShowToast?.(formatRollTitle('Custom Roll', formula), formula, total, rolls);
          }}
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

// Well clear of the bottom edge, so it does not get lost there; higher on a
// desktop.
const dockSx = {
  position: 'sticky',
  bottom: {
    xs: 'calc(24px + env(safe-area-inset-bottom, 0px))',
    md: 'calc(40px + env(safe-area-inset-bottom, 0px))',
  },
  zIndex: 5,
  display: 'flex',
  pt: 1.5,
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

const floatingSx = {
  bgcolor: 'background.paper',
  borderRadius: 999,
  boxShadow: `0 6px 20px ${uiAlpha(UI_COLORS.black, 0.55)}`,
};

const pillSx = {
  ...floatingSx,
  '& .MuiButton-root': { px: 2, py: 0.6 },
  '& .MuiButtonGroup-firstButton': { borderTopLeftRadius: 999, borderBottomLeftRadius: 999 },
  '& .MuiButtonGroup-lastButton': { borderTopRightRadius: 999, borderBottomRightRadius: 999, px: 1.25 },
};

const tabSx = {
  ...floatingSx,
  ...actionButtonTextSx,
  flex: 'none',
  gap: 0.5,
  minWidth: 0,
  px: 1.5,
  py: 0.6,
  color: UI_COLORS.goldLight,
  borderColor: uiAlpha(UI_COLORS.goldLight, 0.4),
  '&:hover': { borderColor: UI_COLORS.goldLight, bgcolor: 'background.paper' },
};
