import { useState } from 'react';
import { Button } from '@mui/material';
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
        aria-pressed={open}
        onClick={() => setOpen((value) => !value)}
      >
        Compendium
      </Button>
      <CompendiumPanel open={open} onClose={() => setOpen(false)} />
    </>
  );
}
