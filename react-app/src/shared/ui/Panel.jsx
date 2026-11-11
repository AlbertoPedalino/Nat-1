import { Box, Paper } from '@mui/material';
import PanelHeader, { panelBodySx, panelFrameSx } from './PanelHeader.jsx';

// A panel: the comic panel's frame, its PanelHeader (the icon on its badge,
// the title, the screentone, all in `tone`) and its body. Every panel of the
// sheet and the builder is one, so none is left without its icon, title or
// texture. `titleAdornment` sits right after the title (a count), `action`
// at the end of the bar; `bodySx` replaces the body's
// padding for a body that lays itself out (a table of rows, tabs).
export default function Panel({ id, icon, title, tone, titleSx, titleAdornment, action, sx, bodySx, children }) {
  return (
    <Paper id={id} variant="outlined" sx={{ ...panelFrameSx, ...sx }}>
      <PanelHeader icon={icon} title={title} tone={tone} titleSx={titleSx}>
        {titleAdornment}
        {action ? <Box sx={{ ml: 'auto' }}>{action}</Box> : null}
      </PanelHeader>
      <Box sx={bodySx ?? panelBodySx}>{children}</Box>
    </Paper>
  );
}
