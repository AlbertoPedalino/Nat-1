import { Box, Typography } from '@mui/material';
import { UI_COLORS } from './colors.js';
import { FONT_SIZES } from './fonts.js';
import { TEXT_STYLES } from './textStyles.js';
import { CARD_PART_RULE_SX } from './interactive.js';
import { asArray } from '../lists.js';

// A part of an opened card under its own small title: the choice an action
// asks for, the weapon a spell attacks through, a spell's upcast text, the
// spell written on a scroll, an item's ability choice. Set off from what is
// above it by the card's part rule (CARD_PART_RULE_SX), its title in the
// display face, small, in `tone` (the accent text by default; the rich-text
// accent for a spell's rules). Every such part is one, so they keep one
// spacing and one title. `title` may be left out for a ruled part that only
// holds a control (a tome's Read button); `sx` lays out the part's body or
// places it.
//
// cardSectionTitleSx is the same title for a block that keeps its own frame
// (an artificer's tinker panels).
export function cardSectionTitleSx(tone = UI_COLORS.accentText) {
  return { ...TEXT_STYLES.title, fontSize: FONT_SIZES.xs, color: tone, mb: 0.25 };
}

const SECTION_SX = Object.freeze({ mt: 1, pt: 1, ...CARD_PART_RULE_SX });

export default function CardSection({ title, tone, children, sx, ...rest }) {
  return (
    <Box sx={[SECTION_SX, ...asArray(sx)]} {...rest}>
      {title != null ? <Typography component="div" sx={cardSectionTitleSx(tone)}>{title}</Typography> : null}
      {children}
    </Box>
  );
}
