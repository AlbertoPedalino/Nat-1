import { Box, Typography } from '@mui/material';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { ExpandableCard } from './ExpandableCard.jsx';
import { FONT_SIZES } from './fonts.js';
import { TEXT_STYLES } from './textStyles.js';

// Nested "click to reveal" disclosure for secondary prose — e.g. an action's
// description tucked under its interactive controls, so the text stays available
// without permanently taking vertical space. Collapsed by default; reuses
// ExpandableCard for the toggle + animation so behaviour matches the rest of the
// sheet.
export default function CollapsibleNote({ label = 'Description', children, sx }) {
  return (
    <ExpandableCard
      containerSx={sx}
      summary={({ toggle, open }) => (
        <Box
          onClick={toggle}
          sx={{
            display: 'inline-flex', alignItems: 'center', gap: 0.5, cursor: 'pointer',
            color: 'text.secondary', py: 0.25, '&:hover': { color: 'text.primary' },
          }}
        >
          {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          <Typography component="span" sx={{ fontSize: FONT_SIZES.xxs, ...TEXT_STYLES.label }}>
            {label}
          </Typography>
        </Box>
      )}
      details={<Box sx={{ mt: 0.5 }}>{children}</Box>}
    />
  );
}
