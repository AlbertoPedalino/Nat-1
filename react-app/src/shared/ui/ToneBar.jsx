import { Box } from '@mui/material';
import { OPACITY } from './colors.js';

// The little bar of colour at the head of a card's name that says what kind
// of thing it is at a glance: an action's category (action, bonus, reaction),
// an item's rarity. One mark for every card that carries one, so a kind reads
// the same in every list. `tone` is a palette colour or a theme path.
export default function ToneBar({ tone }) {
  if (!tone) return null;
  return <Box aria-hidden sx={{ width: 6, height: 28, borderRadius: 1, bgcolor: tone, flexShrink: 0, opacity: OPACITY.solid }} />;
}
