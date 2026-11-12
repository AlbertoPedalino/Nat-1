import { Box, Typography } from '@mui/material';
import { TEXT_STYLES } from './textStyles.js';
import { FONT_SIZES } from './fonts.js';
import { SURFACES } from './surfaces.js';

// The line a list, a panel or a picker shows when it has nothing to show:
// "No matches.", "Select a species.", "None". One quiet aside everywhere, on
// the sheet, in the builder and on every other page. `inList` pads it as a row
// of the list it stands in for (inside a scroll well); `framed` sets it in a
// panel of its own, where the list it replaces would have been one. A whole
// area with nothing in it is a StatePanel instead.
export const emptyTextSx = Object.freeze({ ...TEXT_STYLES.note, fontSize: FONT_SIZES.xl });

const IN_LIST_SX = Object.freeze({ px: 1, py: 1.25 });
const FRAMED_SX = Object.freeze({ ...SURFACES.panel, p: 1, py: 1, minWidth: 0 });

export default function EmptyLine({ children, inList = false, framed = false, role, sx }) {
  const line = (
    <Typography role={role} sx={[emptyTextSx, inList ? IN_LIST_SX : null, ...(framed ? [] : [sx])]}>
      {children}
    </Typography>
  );
  return framed ? <Box sx={[FRAMED_SX, sx]}>{line}</Box> : line;
}
