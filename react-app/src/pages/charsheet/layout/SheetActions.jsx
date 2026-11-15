import { Box } from '@mui/material';
import KeyBar from '../../../shared/ui/KeyBar.jsx';
import { UI_COLORS } from '../../../shared/ui/colors.js';
import { sheetResponsive } from './layout.js';
import { GAME_ICONS } from '../../../shared/ui/gameIcons.js';

// The header's actions: resting, which changes the character (Hit Dice, hit
// points, resources), as the app's bar of keys (KeyBar), each rest in its
// tone. The dice float at the bottom of the sheet instead (SheetDiceDock),
// within reach wherever the sheet is scrolled. On a phone and in an embedded
// sheet the bar takes the width.
export default function SheetActions({
  readOnly, embedded, onShortRest, onLongRest,
}) {
  if (readOnly) return null;
  const keyWidthSx = { flex: sheetResponsive(embedded, { xs: 1, sm: 'none' }) };
  return (
    <Box sx={{
      display: 'flex', gap: 1, flexShrink: 0, justifySelf: 'end', width: sheetResponsive(embedded, { xs: '100%', sm: 'auto' }),
    }}>
      <KeyBar
        label="Rest"
        sx={{ display: 'flex', width: sheetResponsive(embedded, { xs: '100%', sm: 'auto' }) }}
        keys={[
          { id: 'short', icon: GAME_ICONS.shortRest, label: 'Short rest', tone: UI_COLORS.warningText, onClick: onShortRest, sx: keyWidthSx },
          { id: 'long', icon: GAME_ICONS.longRest, label: 'Long rest', tone: UI_COLORS.infoText, onClick: onLongRest, sx: keyWidthSx },
        ]}
      />
    </Box>
  );
}
