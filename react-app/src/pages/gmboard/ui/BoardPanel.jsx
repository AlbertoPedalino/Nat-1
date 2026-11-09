import { Box, Stack, Typography, useTheme } from '@mui/material';
import { UI_FONTS, FONT_SIZES, LETTER_SPACINGS } from '../../../shared/ui/fonts.js';
import { boardPanelSx } from '../../../shared/gmboard/ui/surfaces.js';

// A panel of the GM Board (Travel, Date & Time, Dungeon Explorer, Quest
// Generator…): a bordered paper box whose first row is the icon and title,
// with `titleAdornment` (a count) beside the title and `actions` (buttons) at
// the end of that row.
export default function BoardPanel({
  icon: Icon, title, titleAdornment = null, actions = null, spacing = 1.5, children,
}) {
  const theme = useTheme();
  return (
    <Stack spacing={spacing} sx={panelSx}>
      <Box sx={headRowSx}>
        <Box sx={titleRowSx}>
          {Icon ? <Icon size={14} color={theme.palette.primary.main} /> : null}
          <Typography sx={titleSx}>{title}</Typography>
          {titleAdornment}
        </Box>
        {actions}
      </Box>
      {children}
    </Stack>
  );
}

const panelSx = boardPanelSx;

const headRowSx = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 1,
};

const titleRowSx = {
  display: 'flex',
  alignItems: 'center',
  gap: 0.6,
};

const titleSx = {
  fontFamily: UI_FONTS.display,
  fontSize: FONT_SIZES.xl,
  letterSpacing: LETTER_SPACINGS.md,
  color: 'primary.main',
};
