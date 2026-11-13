import { Accordion, AccordionDetails, AccordionSummary, Stack, Typography } from '@mui/material';
import { ChevronDown } from 'lucide-react';
import { EntryBlocks } from './EntryBlocks.jsx';
import { TEXT_STYLES } from '../ui/textStyles.js';
import { ICON_SIZES } from '../ui/iconSizes.js';

// One collapsed accordion row: title (+ optional `leading` element such as a
// level chip) visible, body on expand. `tone` sets the left border (falls back
// to the theme divider); `titleColor` themes the title; `dense` is the compact
// scale used by the preview pane. The body is `children` when provided, else the
// default `EntryBlocks` render of `entries`; `trailing` sits at the end of the
// title row (a source, a level). A purely descriptive card, unlike the cards
// of actions and spells: shared by the subclass/species detail panels, the
// preview pane and the sheet's Features tab, so the row look stays in one place.
export function EntryAccordion({ title, entries, tone, titleColor = 'text.primary', leading = null, trailing = null, dense = false, children }) {
  const minHeight = dense ? 32 : 36;
  const summaryPx = dense ? 1 : 1.25;
  const contentMy = dense ? 0.5 : 0.6;
  return (
    <Accordion
      disableGutters
      square
      variant="outlined"
      sx={{
        minWidth: 0,
        bgcolor: 'transparent',
        backgroundImage: 'none',
        borderLeft: tone ? `3px solid ${tone}` : (theme) => `3px solid ${theme.palette.divider}`,
        '&:before': { display: 'none' },
        '&.Mui-expanded': { my: 0 },
      }}
    >
      <AccordionSummary
        expandIcon={<ChevronDown size={ICON_SIZES.sm} />}
        sx={{
          minHeight,
          px: summaryPx,
          py: 0,
          '&.Mui-expanded': { minHeight },
          '& .MuiAccordionSummary-content': { my: contentMy, minWidth: 0 },
          '& .MuiAccordionSummary-content.Mui-expanded': { my: contentMy },
        }}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0, flex: 1 }}>
          {leading}
          <Typography variant="body2" noWrap sx={{ ...TEXT_STYLES.cardName, minWidth: 0, flex: 1, color: titleColor }}>
            {title}
          </Typography>
          {trailing}
        </Stack>
      </AccordionSummary>
      <AccordionDetails sx={{ px: summaryPx, pt: 0, pb: 1 }}>
        {children != null ? children : <EntryBlocks entries={entries} emptyText="" />}
      </AccordionDetails>
    </Accordion>
  );
}
