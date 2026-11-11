import { Box, Paper, Typography } from '@mui/material';
import PanelHeader, { panelBodySx, panelFrameSx } from '../../../shared/ui/PanelHeader.jsx';
import { BUILDER_TEXT } from './builderText.js';

// A builder step's panel: the sheet's panel (PanelHeader over the body, in the
// main panel's frame), its `note` the first line of the body and `action` at
// the end of the bar. `tone` is the colour of what the panel is about (the
// class, the species…), on its badge and title.
export default function BuilderPanel({ id, title, icon, tone, note, action, children, sx }) {
  return (
    <Paper id={id} variant="outlined" sx={{ ...panelFrameSx, ...sx }}>
      <PanelHeader icon={icon} title={title} tone={tone} titleSx={BUILDER_TEXT.panelTitle}>
        {action ? <Box sx={{ ml: 'auto' }}>{action}</Box> : null}
      </PanelHeader>
      <Box sx={panelBodySx}>
        {note ? (
          <Typography sx={{ ...BUILDER_TEXT.note, mb: 0.75 }}>{note}</Typography>
        ) : null}
        {children}
      </Box>
    </Paper>
  );
}
