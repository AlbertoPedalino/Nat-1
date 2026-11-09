import { Fragment } from 'react';
import { Box } from '@mui/material';
import { buildItemPropertySegments } from './itemCodes.js';
import { RICH_TEXT_ACCENT } from '../../ui/entityColors.js';
import { UI_FONTS, FONT_SIZES } from '../../ui/fonts.js';

export function ItemPropertyTable({ item, segments, kinds, exclude, sx }) {
  const resolved = Array.isArray(segments)
    ? segments
    : buildItemPropertySegments(item, { kinds, exclude });
  if (!resolved.length) return null;
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'auto 1fr', columnGap: '8px', rowGap: '2px', fontSize: FONT_SIZES.md, ...sx }}>
      {resolved.map((segment) => (
        <Fragment key={segment.label}>
          <Box sx={{ fontFamily: UI_FONTS.display, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: RICH_TEXT_ACCENT, fontSize: FONT_SIZES.xxs, alignSelf: 'center' }}>
            {segment.label}
          </Box>
          <Box sx={{ color: 'text.primary' }}>{segment.value}</Box>
        </Fragment>
      ))}
    </Box>
  );
}
