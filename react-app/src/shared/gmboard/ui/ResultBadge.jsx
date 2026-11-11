import { Box, useTheme } from '@mui/material';
import { FONT_SIZES, LETTER_SPACINGS, FONT_WEIGHTS } from '../../ui/fonts.js';
import { ICON_SIZES } from '../../ui/iconSizes.js';

export default function ResultBadge({ children, tone, icon: Icon }) {
  const theme = useTheme();
  const resolvedTone = tone || theme.palette.gmboard.result.none;

  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: Icon ? 0.5 : 0,
        px: 1,
        py: 0.25,
        borderRadius: 999,
        fontSize: FONT_SIZES.sm,
        fontWeight: FONT_WEIGHTS.bold,
        letterSpacing: LETTER_SPACINGS.sm,
        color: resolvedTone,
        border: `2px solid ${resolvedTone}`,
        bgcolor: theme.palette.gmboard.panelOverlay,
      }}
    >
      {Icon ? <Icon size={ICON_SIZES.xxs} /> : null}
      {children}
    </Box>
  );
}
