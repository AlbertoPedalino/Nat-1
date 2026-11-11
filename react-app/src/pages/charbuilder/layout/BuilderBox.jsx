import { Box, Stack, Typography } from '@mui/material';
import { SURFACES } from '../../../shared/ui/surfaces.js';
import { BUILDER_TEXT } from './builderText.js';

// A box inside a builder panel (a choice, a feat's options, a starting
// equipment block, an ability score): the drawn card, the same padding
// everywhere. `title` heads it, `aside` sits at the end of that row (a count,
// a status); without a title the children lay out their own head.
export default function BuilderBox({ title, aside = null, children, spacing = 1, sx }) {
  return (
    <Box sx={{ ...BUILDER_BOX_SX, ...sx }}>
      <Stack spacing={spacing} sx={{ minWidth: 0 }}>
        {title ? (
          <Stack direction="row" spacing={1} sx={{ alignItems: 'baseline', minWidth: 0 }}>
            <Typography sx={{ ...BUILDER_TEXT.boxTitle, flex: 1, minWidth: 0 }}>{title}</Typography>
            {aside}
          </Stack>
        ) : null}
        {children}
      </Stack>
    </Box>
  );
}

const BUILDER_BOX_SX = {
  ...SURFACES.card,
  p: 1.25,
  minWidth: 0,
};
