import { Box, useTheme } from '@mui/material';

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
        borderRadius: '999px',
        fontSize: '0.68rem',
        fontWeight: 700,
        letterSpacing: '0.03em',
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
