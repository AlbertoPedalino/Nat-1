import { Box } from '@mui/material';

// A roller's verb (Hit, Dmg, Heal, Bonus…), between its icon and its number.
// On a phone the icon says what the roll is, so the button keeps only the
// number: the verb is dropped below the `sm` breakpoint. Every roller button
// writes its verb through this, so the rule lives in one place.
export default function RollerVerb({ children }) {
  if (!children) return null;
  return <Box component="span" sx={verbSx}>{children}{' '}</Box>;
}

// Set off from the dice or modifier after it by more than a word space, so
// "Dmg" and "2d6+3" read as name and number.
const verbSx = (theme) => ({
  mr: 0.5,
  [theme.breakpoints.down('sm')]: { display: 'none' },
});
