import { useState } from 'react';
import { Box, Button } from '@mui/material';
import { BookOpen } from 'lucide-react';
import CompendiumPanel from './CompendiumPanel.jsx';
import { iconOnlyOnPhoneButtonSx, phoneHiddenLabelSx } from '../../shared/ui/iconOnlyOnPhone.js';

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
        sx={iconOnlyOnPhoneButtonSx}
      >
        <Box component="span" sx={phoneHiddenLabelSx}>Compendium</Box>
      </Button>
      <CompendiumPanel open={open} onClose={() => setOpen(false)} />
    </>
  );
}
