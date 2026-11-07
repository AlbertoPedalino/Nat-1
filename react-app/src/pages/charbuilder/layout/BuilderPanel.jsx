import { Box, Paper, Stack, Typography } from '@mui/material';
import { UI_COLORS } from '../../../shared/ui/colors.js';

export default function BuilderPanel({ id, title, icon: Icon, note, action, children, sx }) {
  return (
    <Paper id={id} variant="outlined" sx={{ p: 1, bgcolor: UI_COLORS.headerBg, overflow: 'hidden', ...sx }}>
      <Stack direction="row" spacing={0.75} sx={{ alignItems: 'flex-start', mb: 0.85, pb: 0.55, borderBottom: 1, borderColor: 'divider' }}>
        {Icon ? <Icon size={15} color={UI_COLORS.gold} /> : null}
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="h2" sx={{ color: 'primary.main', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{title}</Typography>
          {note ? (
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.15, fontSize: '0.65rem' }}>
              {note}
            </Typography>
          ) : null}
        </Box>
        {action}
      </Stack>
      {children}
    </Paper>
  );
}
