import { useState } from 'react';
import { Box, IconButton } from '@mui/material';
import { ChevronDown } from 'lucide-react';
import { EntryBlocks } from './EntryBlocks.jsx';
import { entriesToPlainText, entriesToTextBlocks } from './spellEntries.js';

export function ExpandableEntryBlocks({ entries, initialBlocks = 3 }) {
  const [open, setOpen] = useState(false);
  const blocks = entriesToTextBlocks(entries);
  const isLong = blocks.length > initialBlocks || entriesToPlainText(entries).length > 250;
  const visibleBlocks = open ? blocks : blocks.slice(0, initialBlocks);

  return (
    <Box sx={{ minWidth: 0 }}>
      <EntryBlocks blocks={visibleBlocks} emptyText="" />
      {!open && blocks.length > initialBlocks ? (
        <Box sx={{ color: 'text.disabled', fontStyle: 'italic', mt: 0.25 }}>...</Box>
      ) : null}
      {isLong ? (
        <IconButton
          size="small"
          aria-label={open ? 'Show less' : 'Show more'}
          onClick={() => setOpen((value) => !value)}
          sx={{
            mt: 0.25,
            p: 0.25,
            color: 'primary.light',
            transform: open ? 'rotate(180deg)' : 'none',
            transition: 'transform 120ms',
          }}
        >
          <ChevronDown size={16} />
        </IconButton>
      ) : null}
    </Box>
  );
}
