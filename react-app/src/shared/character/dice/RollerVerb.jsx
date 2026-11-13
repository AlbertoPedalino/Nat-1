import { Box } from '@mui/material';
import { phoneHiddenLabelSx } from '../../ui/iconOnlyOnPhone.js';

// A roller's verb (Hit, Dmg, Heal, Bonus…), between its icon and its number.
// On a phone the icon says what the roll is, so the button keeps only the
// number: the verb is dropped on a phone (phoneHiddenLabelSx, the app's one
// rule for words a phone has no room for). Every roller button writes its verb
// through this.
export default function RollerVerb({ children }) {
  if (!children) return null;
  return <Box component="span" sx={verbSx}>{children}{' '}</Box>;
}

// Set off from the dice or modifier after it by more than a word space, so
// "Dmg" and "2d6+3" read as name and number.
const verbSx = { ...phoneHiddenLabelSx, mr: 0.5 };
