import {
  Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography,
} from '@mui/material';
import { CloudRain, Clock } from 'lucide-react';
import HexResultSteps from '../../gmboard/components/HexResultSteps.jsx';
import { formatDateTime } from '../../gmboard/logic/time.js';
import { hasWeatherDisadvantage } from '../../gmboard/logic/weather.js';
import { terrainOption } from '../../../shared/hexcrawl/hexEntry.js';
import { VTT_COLORS, vttAlpha } from '../../../shared/vtt/colors.js';
import { fullscreenContainer } from '../logic/fullscreenContainer.js';

// What the party walked into. A dialog rather than a panel because it is the
// answer to a click and wants reading once, not living on the map.
//
// The two lines above the steps are the state the table asks about out loud —
// what time it is and what the sky is doing — and the weather is the one that
// changes what the roll meant, so it says when it costs the party advantage.
export default function HexResultDialog({ result, onClose }) {
  const open = Boolean(result);
  const clock = result?.clock || null;
  const hex = result?.hex || null;
  const terrain = terrainOption(hex?.terrain);
  const disadvantage = clock ? hasWeatherDisadvantage(clock.meteo, clock.intensity) : false;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      container={fullscreenContainer}
    >
      {/* The weather rides in the corner of the title rather than in the body:
          it is the standing condition every roll below was made under, and it is
          the first thing the table asks about. */}
      <DialogTitle sx={titleRowSx}>
        <Box component="span" sx={titleSx}>
          {hex ? `Hex ${hex.q}, ${hex.r}` : 'Hex'}
          {/* The hours the leg actually cost, which is the terrain's own only
              when the party is walking it in fair weather. */}
          {terrain ? ` · ${terrain.label} (${result?.travelHours ?? terrain.hours}h)` : ''}
        </Box>
        {clock ? (
          <Box sx={{ ...weatherBadgeSx, ...(disadvantage ? weatherWarnSx : null) }}>
            <CloudRain size={13} />
            <Typography component="span" sx={weatherTextSx}>
              {clock.meteo}{clock.intensity ? ` · ${clock.intensity}` : ''}
              {disadvantage ? ' · disadvantage' : ''}
            </Typography>
          </Box>
        ) : null}
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={0.6} sx={{ mb: 1.25 }}>
          {clock ? (
            <Box sx={lineSx}>
              <Clock size={14} />
              <Typography sx={lineTextSx}>{formatDateTime(clock)}</Typography>
            </Box>
          ) : null}
        </Stack>

        {result ? <HexResultSteps result={{ steps: result.steps }} /> : null}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

const titleRowSx = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 1,
  flexWrap: 'wrap',
};

const titleSx = {
  fontFamily: '"Cinzel", Georgia, serif',
  fontSize: '0.9rem',
  letterSpacing: '0.06em',
  color: 'primary.main',
};

const weatherBadgeSx = {
  display: 'flex',
  alignItems: 'center',
  gap: 0.5,
  px: 0.9,
  py: 0.3,
  borderRadius: 1,
  border: '1px solid',
  borderColor: 'divider',
  bgcolor: vttAlpha(VTT_COLORS.black, 0.25),
  color: 'text.secondary',
};

const weatherWarnSx = { borderColor: 'warning.main', color: 'warning.main' };

const weatherTextSx = { fontSize: '0.68rem', letterSpacing: '0.03em' };

const lineSx = { display: 'flex', alignItems: 'center', gap: 0.6, color: 'text.secondary' };
const lineTextSx = { fontSize: '0.75rem' };
