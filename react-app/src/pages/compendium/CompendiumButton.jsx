import { useState } from 'react';
import { Box, Button } from '@mui/material';
import { BookOpen } from 'lucide-react';
import CompendiumPanel from './CompendiumPanel.jsx';

// The compendium from a session's top bar: opens and closes the side panel.
export default function CompendiumButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        size="small"
        variant={open ? 'contained' : 'outlined'}
        startIcon={<BookOpen size={14} />}
        aria-label="Compendium"
        aria-pressed={open}
        onClick={() => setOpen((value) => !value)}
        sx={iconOnlyOnPhoneSx}
      >
        <Box component="span" sx={labelSx}>Compendium</Box>
      </Button>
      <CompendiumPanel open={open} onClose={() => setOpen(false)} />
    </>
  );
}

// Phones keep only the book: the top bar has no room for the word.
const iconOnlyOnPhoneSx = {
  minWidth: { xs: 32, sm: 64 },
  px: { xs: 0.75, sm: 1.25 },
  '& .MuiButton-startIcon': {
    mr: { xs: 0, sm: 1 },
    ml: 0,
  },
};

const labelSx = {
  display: { xs: 'none', sm: 'inline' },
};
