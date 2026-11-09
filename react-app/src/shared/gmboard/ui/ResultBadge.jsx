import { Box, useTheme } from '@mui/material';
import { FONT_SIZES, LETTER_SPACINGS } from '../../ui/fonts.js';

export default function ResultBadge({ children, tone, icon: Icon }) {
  const theme = useTheme();
  const resolvedTone = tone || theme.palette.gmboard.rarity.Common;

  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: Icon ? 0.4 : 0,
        px: 0.9,
        py: 0.25,
        borderRadius: 999,
        fontSize: FONT_SIZES.sm,
        fontWeight: 700,
        letterSpacing: LETTER_SPACINGS.sm,
        color: resolvedTone,
        border: `1px solid ${resolvedTone}`,
        bgcolor: theme.palette.gmboard.panelOverlay,
      }}
    >
      {Icon ? <Icon size={11} /> : null}
      {children}
    </Box>
  );
}
