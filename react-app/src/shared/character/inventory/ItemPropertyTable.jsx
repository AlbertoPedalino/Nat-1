import { Fragment } from 'react';
import { Box } from '@mui/material';
import { buildItemPropertySegments } from './itemCodes.js';
import { RICH_TEXT_ACCENT } from '../../ui/entityColors.js';
import { FONT_SIZES } from '../../ui/fonts.js';
import { TEXT_STYLES } from '../../ui/textStyles.js';

export function ItemPropertyTable({ item, segments, kinds, exclude, sx }) {
  const resolved = Array.isArray(segments)
    ? segments
    : buildItemPropertySegments(item, { kinds, exclude });
  if (!resolved.length) return null;
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'auto 1fr', columnGap: 1, rowGap: 0.25, fontSize: FONT_SIZES.md, ...sx }}>
      {resolved.map((segment) => (
        <Fragment key={segment.label}>
          <Box sx={{ ...TEXT_STYLES.label, color: RICH_TEXT_ACCENT, fontSize: FONT_SIZES.xxs, alignSelf: 'center' }}>
            {segment.label}
          </Box>
          <Box sx={{ color: 'text.primary' }}>{segment.value}</Box>
        </Fragment>
      ))}
    </Box>
  );
}
