import { Box, Stack, Typography, useTheme } from '@mui/material';
import { FONT_SIZES } from '../../../shared/ui/fonts.js';
import { boardPanelSx } from '../../../shared/gmboard/ui/surfaces.js';
import { TEXT_STYLES } from '../../../shared/ui/textStyles.js';
import { ICON_SIZES } from '../../../shared/ui/iconSizes.js';

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
          {Icon ? <Icon size={ICON_SIZES.sm} color={theme.palette.primary.main} /> : null}
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
  gap: 0.5,
};

const titleSx = {
  ...TEXT_STYLES.title,
  fontSize: FONT_SIZES.xl,
  color: 'primary.main',
};
