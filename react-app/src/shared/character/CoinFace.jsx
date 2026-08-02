import { Box } from '@mui/material';
import { Cross, User } from 'lucide-react';

// The two sides of a coin: a head, and a cross.
//
// Both from the icon set the rest of the app draws with, rather than artwork of
// this file's own. "Heads" spelled out in letters read as a label stuck to a
// counter instead of a coin, but a one-off silhouette drawn here would be the
// only hand-cut icon in the codebase.
//
// Drawn thick and in `currentColor` so they read as struck into the metal at
// the size a die is actually shown — an icon at its default hairline weight
// disappears on a 40px disc in motion.
export default function CoinFace({ kind, size }) {
  const Face = kind === 'tails' ? Cross : User;
  return (
    <Box sx={{ ...faceSx, width: size, height: size }}>
      <Face size={size} strokeWidth={2.4} />
    </Box>
  );
}

const faceSx = {
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  filter: 'drop-shadow(0 1px 0 rgba(0,0,0,0.45))',
};
