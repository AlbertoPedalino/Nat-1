import { Box } from '@mui/material';
import DiceControl from '../../../shared/character/dice/DiceControl.jsx';
import { sheetColumnSx } from './layout.js';
import { useStoreValue } from '../../../shared/valueStore.js';
import { useRootStyle } from '../../../shared/ui/liveStyle.js';

// The sheet's dice, always at hand: the shared DiceControl (the gold pill,
// Roll and Log written beside the icons from a tablet up) floating in the
// bottom-right corner of the sheet on every screen, so a roll never needs a
// scroll back to the top. Small enough to cover little, bright enough to be
// found without looking for it. It sits as far from the side as from the
// bottom (DOCK_INSET).
//
// Sticky to the sheet, not fixed to the window: it rides the bottom edge of
// whatever scrolls the sheet (the page, or the panel an embedded sheet sits
// in) and, at the end of the sheet, settles into its own row after the last
// panel, so nothing is left under it. Only the pill takes clicks; the band
// around it lets them through.
export default function SheetDiceDock({
  embedded, logStore, onRoll,
}) {
  // Read here, from its store (useSheetRolls): a roll redraws the dock, not the
  // sheet.
  const rollLog = useStoreValue(logStore);

  // Chrome on Android stretches the page when a scroll runs into its end, and
  // the dock on the bottom edge stretches with it. The sheet's own page turns
  // that effect off while it is open; an embedded sheet's panel does the same
  // for itself (FloatingSheetPanel).
  useRootStyle({ overscrollBehaviorY: 'none' }, { enabled: !embedded });

  return (
    <Box sx={embedded ? dockSx : pageDockSx}>
      <DiceControl
        log={rollLog}
        onRoll={onRoll}
        onClear={() => logStore.set([])}
        emptyText="No rolls yet. Make an ability check, save, or attack to see it here."
        placement="up"
      />
    </Box>
  );
}

// The pill's distance from the bottom and from the right: the same on both,
// so it reads as placed rather than pushed there.
const DOCK_INSET = { xs: '24px', md: '40px' };
const inset = (size, edge) => `calc(${DOCK_INSET[size]} + env(safe-area-inset-${edge}, 0px))`;

// The band sits on the bottom edge and carries the space under the pill
// itself. Being the last thing in the sheet, its place while scrolling and its
// place at the end are the same: nothing jumps, and at the end it has its own
// room below the last panel. Bottom right, on every screen.
const dockSx = {
  position: 'sticky',
  bottom: 0,
  zIndex: 5,
  display: 'flex',
  justifyContent: 'flex-end',
  pt: 1.5,
  pb: { xs: inset('xs', 'bottom'), md: inset('md', 'bottom') },
  pr: { xs: inset('xs', 'right'), md: inset('md', 'right') },
  pointerEvents: 'none',
  '& > *': { pointerEvents: 'auto' },
};

// On its own page: in the sheet's column, so the pill stays by the sheet's
// right edge on a wide screen.
const pageDockSx = {
  ...dockSx,
  ...sheetColumnSx(false),
  pr: { xs: inset('xs', 'right'), md: inset('md', 'right') },
};
