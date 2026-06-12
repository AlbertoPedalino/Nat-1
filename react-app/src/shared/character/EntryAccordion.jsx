import { Accordion, AccordionDetails, AccordionSummary, Stack, Typography } from '@mui/material';
import { ChevronDown } from 'lucide-react';
import { EntryBlocks } from './EntryBlocks.jsx';

// Split 5etools `entries` into named rows + a leading group of unnamed intro
// text collapsed under a single `introLabel` row. Named sub-entries (e.g. each
// species trait or subclass feature) map one-to-one to accordion rows.
export function splitNamedEntries(entries, introLabel = 'Description') {
  const list = entries == null ? [] : (Array.isArray(entries) ? entries : [entries]);
  const named = list.filter((entry) => entry && typeof entry === 'object' && entry.name);
  const unnamed = list.filter((entry) => !(entry && typeof entry === 'object' && entry.name));
  return [
    ...(unnamed.length ? [{ name: introLabel, entries: unnamed }] : []),
    ...named,
  ];
}

// One collapsed accordion row: title (+ optional `leading` element such as a
// level chip) visible, body on expand. `tone` sets the left border (falls back
// to the theme divider); `titleColor` themes the title; `dense` is the compact
// scale used by the preview pane. The body is `children` when provided, else the
// default `EntryBlocks` render of `entries`. Shared by the subclass/species
// detail panels and the preview pane so the row look stays in one place.
export function EntryAccordion({ title, entries, tone, titleColor = 'text.primary', leading = null, dense = false, children }) {
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
        expandIcon={<ChevronDown size={14} />}
        sx={{
          minHeight,
          px: summaryPx,
          py: 0,
          '&.Mui-expanded': { minHeight },
          '& .MuiAccordionSummary-content': { my: contentMy, minWidth: 0 },
          '& .MuiAccordionSummary-content.Mui-expanded': { my: contentMy },
        }}
      >
        <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
          {leading}
          <Typography variant="body2" fontWeight={700} noWrap sx={{ minWidth: 0, color: titleColor, overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {title}
          </Typography>
        </Stack>
      </AccordionSummary>
      <AccordionDetails sx={{ px: summaryPx, pt: 0, pb: 1 }}>
        {children != null ? children : <EntryBlocks entries={entries} emptyText="" />}
      </AccordionDetails>
    </Accordion>
  );
}
