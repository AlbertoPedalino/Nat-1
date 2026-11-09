import { Box, Paper, Stack, Typography } from '@mui/material';
import { UI_COLORS } from '../../../shared/ui/colors.js';
import { FONT_SIZES } from '../../../shared/ui/fonts.js';
import { TEXT_STYLES } from '../../../shared/ui/textStyles.js';

export default function BuilderPanel({ id, title, icon: Icon, note, action, children, sx }) {
  return (
    <Paper id={id} variant="outlined" sx={{ p: 1, bgcolor: UI_COLORS.surfaceHeader, overflow: 'hidden', ...sx }}>
      <Stack direction="row" spacing={0.75} sx={{ alignItems: 'flex-start', mb: 0.75, pb: 0.5, borderBottom: 1, borderColor: 'divider' }}>
        {Icon ? <Icon size={15} color={UI_COLORS.accent} /> : null}
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="h2" sx={{ color: 'primary.main', ...TEXT_STYLES.label }}>{title}</Typography>
          {note ? (
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.25, fontSize: FONT_SIZES.sm }}>
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
