import { Typography } from '@mui/material';
import Panel from '../../../shared/ui/Panel.jsx';
import { BUILDER_TEXT } from './builderText.js';

// A builder step's panel: the shared Panel at the builder's text size, its
// `note` the first line of the body and `action` at the end of the bar.
// `tone` is the colour of what the panel is about (the class, the species…).
export default function BuilderPanel({ id, title, icon, tone, note, action, children, sx }) {
  return (
    <Panel id={id} icon={icon} title={title} tone={tone} titleSx={BUILDER_TEXT.panelTitle} action={action} sx={sx}>
      {note ? <Typography sx={{ ...BUILDER_TEXT.note, mb: 0.75 }}>{note}</Typography> : null}
      {children}
    </Panel>
  );
}
