import { Box, Typography } from '@mui/material';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { ExpandableCard } from './ExpandableCard.jsx';

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
            display: 'inline-flex', alignItems: 'center', gap: 0.4, cursor: 'pointer',
            color: 'text.secondary', py: 0.2, '&:hover': { color: 'text.primary' },
          }}
        >
          {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          <Typography component="span" sx={{ fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: '"Cinzel", Georgia, serif' }}>
            {label}
          </Typography>
        </Box>
      )}
      details={<Box sx={{ mt: 0.4 }}>{children}</Box>}
    />
  );
}
