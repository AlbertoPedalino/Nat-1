import { Box, Tooltip } from '@mui/material';
import { Info } from 'lucide-react';

// A rule that only matters the first time, behind an icon. A panel that spells
// out every one of them in a caption reads like documentation, and the control
// it explains is what the GM came to the panel for.
export default function InfoHint({ text, label }) {
  return (
    <Tooltip title={text} enterTouchDelay={0} leaveTouchDelay={6000}>
      <Box component="span" role="button" tabIndex={0} aria-label={label} sx={infoHintSx}>
        <Info size={13} />
      </Box>
    </Tooltip>
  );
}

const infoHintSx = {
  display: 'inline-flex',
  alignItems: 'center',
  flexShrink: 0,
  color: 'text.secondary',
  cursor: 'help',
  borderRadius: '50%',
  '&:hover, &:focus-visible': { color: 'primary.main' },
};
