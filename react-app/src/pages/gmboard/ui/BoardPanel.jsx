import { Stack } from '@mui/material';
import Panel from '../../../shared/ui/Panel.jsx';

// A panel of the GM Board (Travel, Date & Time, Dungeon Explorer, Quest
// Generator…): the app's Panel — badge, title and screentone in the bar —
// with `titleAdornment` (a count) beside the title and `actions` (buttons) at
// the end of the bar, its children spaced by `spacing`.
export default function BoardPanel({
  icon, title, titleAdornment = null, actions = null, spacing = 1.5, children,
}) {
  return (
    <Panel icon={icon} title={title} titleAdornment={titleAdornment} action={actions}>
      <Stack spacing={spacing}>{children}</Stack>
    </Panel>
  );
}
