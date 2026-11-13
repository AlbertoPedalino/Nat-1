import { Box, Paper } from '@mui/material';
import PanelHeader, { panelBodySx, panelFrameSx } from './PanelHeader.jsx';

// A panel: the comic panel's frame, its PanelHeader (the icon on its badge,
// the title, the screentone, all in `tone`) and its body. Every panel of the
// sheet and the builder is one, so none is left without its icon, title or
// texture. `titleAdornment` sits right after the title (a count), `action`
// at the end of the bar; `bodySx` replaces the body's
// padding for a body that lays itself out (a table of rows, tabs).
// `fill` hands the panel's whole height to its body (a column whose last
// child takes what is left): a panel stretched by its row — a grid's taller
// neighbour — shows its list down to its bottom edge, never an empty floor.
export default function Panel({ id, icon, title, tone, titleSx, titleAdornment, action, fill = false, sx, bodySx, children }) {
  return (
    <Paper id={id} variant="outlined" sx={{ ...panelFrameSx, ...(fill ? FILL_FRAME_SX : null), ...sx }}>
      <PanelHeader icon={icon} title={title} tone={tone} titleSx={titleSx}>
        {titleAdornment}
        {action ? <Box sx={{ ml: 'auto' }}>{action}</Box> : null}
      </PanelHeader>
      <Box sx={[bodySx ?? panelBodySx, fill ? FILL_BODY_SX : null]}>{children}</Box>
    </Paper>
  );
}

const FILL_FRAME_SX = { display: 'flex', flexDirection: 'column' };
const FILL_BODY_SX = { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' };
