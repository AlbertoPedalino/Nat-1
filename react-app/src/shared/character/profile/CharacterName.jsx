import { Typography } from '@mui/material';
import { TEXT_STYLES } from '../../ui/textStyles.js';
import { UI_COLORS } from '../../ui/colors.js';

// A character's name as the app writes it wherever it stands for them (the
// sheet's top bar, the builder's preview): the heading face, inked, in the
// accent, on one line. `sx` sets the size.
export default function CharacterName({ name, sx }) {
  return (
    <Typography
      noWrap
      sx={{ ...TEXT_STYLES.heading, color: UI_COLORS.accentText, minWidth: 0, ...sx }}
    >
      {name || 'Unnamed Character'}
    </Typography>
  );
}
