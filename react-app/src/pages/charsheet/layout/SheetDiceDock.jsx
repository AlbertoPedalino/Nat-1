import { Box } from '@mui/material';
import DiceControl from '../../../shared/character/dice/DiceControl.jsx';
import { rollFormula, formatRollTitle } from '../../../shared/character/dice/dice.js';
import { UI_COLORS, uiAlpha } from '../../../shared/ui/colors.js';
import { sheetColumnSx } from './layout.js';

// The sheet's dice, always at hand: the shared DiceControl floating at the
// bottom of the sheet (centred on a phone or tablet, at the right on a desktop,
// in the empty margin beside the sheet when there is room), so a roll never
// needs a scroll back to the top.
//
// Sticky to the sheet, not fixed to the window: it rides the bottom edge of
// whatever scrolls the sheet (the page, or the panel an embedded sheet sits
// in) and, at the end of the sheet, settles into its own row after the last
// panel, so nothing is left under it. Only the pill takes clicks; the band
// around it lets them through, and anything passing under the pill can be
// scrolled out from under it.
export default function SheetDiceDock({
  embedded, rollLog, onClearLog, onShowToast,
}) {
  return (
    <Box sx={embedded ? { ...dockSx, justifyContent: 'center' } : pageDockSx}>
      <DiceControl
        log={rollLog}
        onRoll={(formula) => {
          const { total, rolls } = rollFormula(formula);
          onShowToast?.(formatRollTitle('Custom Roll', formula), formula, total, rolls);
        }}
        onClear={onClearLog}
        emptyText="No rolls yet. Make an ability check, save, or attack to see it here."
        placement="up"
        sx={pillSx}
      />
    </Box>
  );
}

// Well clear of the bottom edge, so it does not get lost there; higher on a
// desktop. An embedded sheet centres it in its panel, whatever the screen.
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

// On its own page: centred below a desktop; on a desktop at the right of the
// sheet's column; and where the screen leaves an empty margin beside the
// column wide enough to hold it, out in that margin, clear of the sheet.
const SIDE_MARGIN_FITS = '@media (min-width: 1680px)';
const pageDockSx = {
  ...dockSx,
  ...sheetColumnSx(false),
  justifyContent: { xs: 'center', md: 'flex-end' },
  [SIDE_MARGIN_FITS]: { maxWidth: 'none', mx: 0, px: 3 },
};

const pillSx = {
  bgcolor: 'background.paper',
  borderRadius: 999,
  boxShadow: `0 6px 20px ${uiAlpha(UI_COLORS.black, 0.55)}`,
  '& .MuiButton-root': { px: 2, py: 0.6 },
  '& .MuiButtonGroup-firstButton': { borderTopLeftRadius: 999, borderBottomLeftRadius: 999 },
  '& .MuiButtonGroup-lastButton': { borderTopRightRadius: 999, borderBottomRightRadius: 999 },
};
