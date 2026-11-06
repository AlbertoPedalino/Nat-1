import { lazy, Suspense, useState } from 'react';
import { Box, Button } from '@mui/material';
import { BookOpen } from 'lucide-react';
import { iconOnlyOnPhoneButtonSx, phoneHiddenLabelSx } from '../../shared/ui/iconOnlyOnPhone.js';
import { asArray } from '../../shared/lists.js';

// Loaded on first opening: the button is in every top bar, and most pages
// never open the compendium.
const CompendiumPanel = lazy(() => import('./CompendiumPanel.jsx'));

// The compendium from any top bar: opens and closes the side panel.
export default function CompendiumButton({ sx }) {
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
        sx={[iconOnlyOnPhoneButtonSx, ...asArray(sx)]}
      >
        <Box component="span" sx={phoneHiddenLabelSx}>Compendium</Box>
      </Button>
      {open ? (
        <Suspense fallback={null}>
          <CompendiumPanel open onClose={() => setOpen(false)} />
        </Suspense>
      ) : null}
    </>
  );
}
