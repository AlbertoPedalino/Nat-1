import { Box, Button, Stack, Typography } from '@mui/material';
import { Clock } from 'lucide-react';
import HexResultSteps from '../../../shared/hexcrawl/ui/HexResultSteps.jsx';
import { formatCampaignDateTime } from '../../../shared/gmboard/campaignTime.js';
import { hasWeatherDisadvantage, weatherName } from '../../../shared/gmboard/weather.js';
import { weatherIcon } from '../../../shared/hexcrawl/hexIcons.js';
import { terrainOption } from '../../../shared/hexcrawl/hexEntry.js';
import { VTT_COLORS, vttAlpha } from '../../../shared/vtt/colors.js';
import { FONT_SIZES, LETTER_SPACINGS } from '../../../shared/ui/fonts.js';
import BattleMapDialog from '../map/BattleMapDialog.jsx';
import { TEXT_STYLES } from '../../../shared/ui/textStyles.js';
import { OPACITY } from '../../../shared/ui/colors.js';
import { ICON_SIZES } from '../../../shared/ui/iconSizes.js';

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
  const disadvantage = clock ? hasWeatherDisadvantage(clock.weather, clock.intensity) : false;
  const WeatherIcon = weatherIcon(clock?.weather);

  return (
    <BattleMapDialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      // The weather rides in the corner of the title rather than in the body:
      // it is the standing condition every roll below was made under, and it is
      // the first thing the table asks about.
      titleSx={titleRowSx}
      title={(
        <>
          <Box component="span" sx={titleSx}>
            {hex ? `Hex ${hex.q}, ${hex.r}` : 'Hex'}
            {/* The hours the leg actually cost, which is the terrain's own only
                when the party is walking it in fair weather. */}
            {terrain ? ` · ${terrain.label} (${result?.travelHours ?? terrain.hours}h)` : ''}
          </Box>
          {clock ? (
            <Box sx={{ ...weatherBadgeSx, ...(disadvantage ? weatherWarnSx : null) }}>
              <WeatherIcon size={ICON_SIZES.xs} />
              <Typography component="span" sx={weatherTextSx}>
                {weatherName(clock.weather, clock.intensity)}
                {disadvantage ? ' · disadvantage' : ''}
              </Typography>
            </Box>
          ) : null}
        </>
      )}
      contentProps={{ dividers: true }}
      actions={<Button onClick={onClose}>Close</Button>}
    >
      <Stack spacing={0.5} sx={{ mb: 1.25 }}>
        {clock ? (
          <Box sx={lineSx}>
            <Clock size={ICON_SIZES.sm} />
            <Typography sx={lineTextSx}>{formatCampaignDateTime(clock)}</Typography>
          </Box>
        ) : null}
      </Stack>

      {result ? <HexResultSteps result={{ steps: result.steps }} /> : null}
    </BattleMapDialog>
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
  ...TEXT_STYLES.title,
  fontSize: FONT_SIZES.xxl,
  color: 'primary.main',
};

const weatherBadgeSx = {
  display: 'flex',
  alignItems: 'center',
  gap: 0.5,
  px: 1,
  py: 0.25,
  borderRadius: 1,
  border: '1px solid',
  borderColor: 'divider',
  bgcolor: vttAlpha(VTT_COLORS.black, OPACITY.shade),
  color: 'text.secondary',
};

const weatherWarnSx = { borderColor: 'warning.main', color: 'warning.main' };

const weatherTextSx = { fontSize: FONT_SIZES.sm, letterSpacing: LETTER_SPACINGS.sm };

const lineSx = { display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary' };
const lineTextSx = { fontSize: FONT_SIZES.lg };
