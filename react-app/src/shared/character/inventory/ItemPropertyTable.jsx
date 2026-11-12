import { buildItemPropertySegments } from './itemCodes.js';
import { FONT_SIZES } from '../../ui/fonts.js';
import LabelValueGrid from '../../ui/LabelValueGrid.jsx';

export function ItemPropertyTable({ item, segments, kinds, exclude, sx }) {
  const resolved = Array.isArray(segments)
    ? segments
    : buildItemPropertySegments(item, { kinds, exclude });
  return <LabelValueGrid rows={resolved} fontSize={FONT_SIZES.md} sx={sx} />;
}
