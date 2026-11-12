import { Box, Button, Typography } from '@mui/material';
import { Clock } from 'lucide-react';
import HexResultSteps from '../../../shared/hexcrawl/ui/HexResultSteps.jsx';
import { formatCampaignDateTime } from '../../../shared/gmboard/campaignTime.js';
import { FONT_SIZES } from '../../../shared/ui/fonts.js';
import { ICON_SIZES } from '../../../shared/ui/iconSizes.js';
import SheetDialog from '../../../shared/ui/SheetDialog.jsx';
import { hexLabel } from './hexLabel.js';
import WeatherTag from './WeatherTag.jsx';

// What the party walked into. A dialog rather than a panel because it is the
// answer to a click and wants reading once, not living on the map.
//
// The line above the steps is the state the table asks about out loud — what
// time it is — and the weather, which changes what the roll meant, rides in
// the title bar and says when it costs the party advantage.
export default function HexResultDialog({ result, onClose }) {
  const clock = result?.clock || null;

  return (
    <SheetDialog
      surface="map"
      open={Boolean(result)}
      onClose={onClose}
      maxWidth="sm"
      title={hexLabel(result?.hex || null, result?.travelHours)}
      // The weather rides in the corner of the title rather than in the body:
      // it is the standing condition every roll below was made under, and it is
      // the first thing the table asks about.
      headerRight={clock ? <WeatherTag weather={clock.weather} intensity={clock.intensity} /> : null}
      actions={<Button onClick={onClose}>Close</Button>}
    >
      {clock ? (
        <Box sx={lineSx}>
          <Clock size={ICON_SIZES.sm} />
          <Typography sx={lineTextSx}>{formatCampaignDateTime(clock)}</Typography>
        </Box>
      ) : null}

      {result ? <HexResultSteps result={{ steps: result.steps }} /> : null}
    </SheetDialog>
  );
}

const lineSx = { display: 'flex', alignItems: 'center', gap: 0.5, mb: 1.25, color: 'text.secondary' };
const lineTextSx = { fontSize: FONT_SIZES.lg };
