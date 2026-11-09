import { FONT_SIZES, LINE_HEIGHTS } from '../../../shared/ui/fonts.js';
import { CONTROL_HEIGHTS } from '../../../shared/ui/controlHeights.js';

// The character builder's density. The builder uses the app's one theme for
// every colour, face and surface; what it keeps is smaller default sizes, so
// its step panels fit side by side. Each rule is wrapped in :where() so it
// weighs no more than a component's own sx, which still decides when it sets
// a size.
export const builderRootSx = {
  minHeight: '100vh',
  bgcolor: 'background.default',
  '& :where(.MuiTypography-body1)': { fontSize: FONT_SIZES.xl },
  '& :where(.MuiTypography-body2)': { fontSize: FONT_SIZES.md },
  '& :where(.MuiTypography-caption)': { fontSize: FONT_SIZES.xs },
  '& :where(.MuiTypography-h1)': { fontSize: FONT_SIZES.lead, lineHeight: LINE_HEIGHTS.tight },
  '& :where(.MuiTypography-h2)': { fontSize: FONT_SIZES.xl, lineHeight: LINE_HEIGHTS.tight },
  '& :where(.MuiButton-root)': { minHeight: 0, fontSize: FONT_SIZES.xs, px: 1, py: 0.5 },
  '& :where(.MuiInputBase-root)': { fontSize: FONT_SIZES.md },
  '& :where(.MuiInputBase-input)': { py: 1, fontSize: FONT_SIZES.md },
  '& :where(.MuiAlert-root)': { py: 0.25, px: 1, fontSize: FONT_SIZES.md },
  '& :where(.MuiCardContent-root)': { p: 0.75, '&:last-child': { pb: 0.75 } },
  '& :where(.MuiChip-root)': { height: CONTROL_HEIGHTS.xs, fontSize: FONT_SIZES.xxs },
  '& :where(.MuiListItemButton-root)': { px: 1, py: 0.5 },
};
