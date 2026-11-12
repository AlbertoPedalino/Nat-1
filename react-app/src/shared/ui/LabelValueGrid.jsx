import { Fragment } from 'react';
import { Box } from '@mui/material';
import { RICH_TEXT_ACCENT } from './entityColors.js';
import { FONT_SIZES } from './fonts.js';
import { TEXT_STYLES } from './textStyles.js';

// A short table of facts, each a small uppercase label beside its value: a
// spell's Casting Time / Range / Components / Duration, an item's properties.
// `rows` are { label, value }; nothing is drawn when there are none.
// `fontSize` sizes the values (the labels stay small).
export default function LabelValueGrid({ rows, fontSize = FONT_SIZES.sm, sx }) {
  if (!rows?.length) return null;
  return (
    <Box sx={[gridSx, { fontSize }, sx]}>
      {rows.map((row) => (
        <Fragment key={row.label}>
          <Box sx={labelSx}>{row.label}</Box>
          <Box sx={{ color: 'text.primary' }}>{row.value}</Box>
        </Fragment>
      ))}
    </Box>
  );
}

const gridSx = { display: 'grid', gridTemplateColumns: 'auto 1fr', columnGap: 1, rowGap: 0.25 };

const labelSx = {
  ...TEXT_STYLES.label,
  color: RICH_TEXT_ACCENT,
  fontSize: FONT_SIZES.xxs,
  alignSelf: 'center',
};
