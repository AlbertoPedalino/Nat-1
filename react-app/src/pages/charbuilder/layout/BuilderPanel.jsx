import { Box, Paper, Typography } from '@mui/material';
import PanelHeader, { panelBodySx } from '../../../shared/ui/PanelHeader.jsx';
import { FONT_SIZES } from '../../../shared/ui/fonts.js';
import { TEXT_STYLES } from '../../../shared/ui/textStyles.js';

// A builder step's panel: the sheet's panel (PanelHeader over the body), its
// `note` the first line of the body and `action` at the end of the bar.
export default function BuilderPanel({ id, title, icon, note, action, children, sx }) {
  return (
    <Paper id={id} variant="outlined" sx={{ overflow: 'hidden', ...sx }}>
      <PanelHeader icon={icon} title={title}>
        {action ? <Box sx={{ ml: 'auto' }}>{action}</Box> : null}
      </PanelHeader>
      <Box sx={panelBodySx}>
        {note ? (
          <Typography sx={{ ...TEXT_STYLES.note, fontSize: FONT_SIZES.sm, mb: 0.75 }}>{note}</Typography>
        ) : null}
        {children}
      </Box>
    </Paper>
  );
}
