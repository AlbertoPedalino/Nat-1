import { Box, Stack, Typography, useTheme } from '@mui/material';
import { weatherIcon } from '../../hexcrawl/hexIcons.js';
import {
  hasWeatherDisadvantage, weatherEffectLabel, weatherName, weatherTimerLabel, weatherTone,
} from '../weather.js';
import { formatCampaignDateTime } from '../campaignTime.js';
import { FONT_SIZES, FONT_WEIGHTS, LINE_HEIGHTS } from '../../ui/fonts.js';
import { ICON_SIZES } from '../../ui/iconSizes.js';
import { calloutSx } from '../../ui/surfaces.js';

// The weather said the same way on the GM Board and on the map: the condition
// first, in its colour, then what it costs. The cost turns amber when it is the
// party's rolls that pay it.
export default function WeatherSummary({ weather, intensity, dense = false }) {
  const theme = useTheme();
  const tone = weatherTone(theme.palette, weather);
  const Icon = weatherIcon(weather);
  const disadvantage = hasWeatherDisadvantage(weather, intensity);
  return (
    <Stack direction="row" spacing={dense ? 1 : 0.75} sx={{ alignItems: 'center' }}>
      <Icon size={ICON_SIZES.xl} color={tone} />
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontSize: dense ? FONT_SIZES.xl : FONT_SIZES.xxl, fontWeight: FONT_WEIGHTS.bold, lineHeight: LINE_HEIGHTS.tight, color: tone }}>
          {weatherName(weather, intensity)}
        </Typography>
        <Typography sx={{ fontSize: dense ? FONT_SIZES.sm : FONT_SIZES.md, color: disadvantage ? 'warning.main' : 'text.secondary' }}>
          {weatherEffectLabel(weather, intensity)}
        </Typography>
      </Box>
    </Stack>
  );
}

// The weather as a card of its own, the same on the GM Board's clock strip and
// in the battle map's hexcrawl panel: a callout in the weather's tone holding
// the WeatherSummary, with a line under it for when it was read and when the
// next weather check falls. `clock` is a campaign clock (weather, intensity,
// season and the weather counters, the date and time). `showTimer` writes the
// next check ("Next check in 3h", or a quiet prompt to pick a season while
// there is none); `showDate` writes the campaign date and time, for a panel
// that has no clock of its own beside it. `sx` places the card.
export function WeatherCard({ clock, showTimer = true, showDate = false, sx }) {
  const theme = useTheme();
  const tone = weatherTone(theme.palette, clock.weather);
  // A clock row that predates the weather counters has neither, and a
  // countdown to nowhere is worse than no countdown.
  const timed = showTimer && (!clock.season || (
    Number.isFinite(clock.nextWeatherIn) && Number.isFinite(clock.hoursSinceWeather)
  ));
  return (
    <Box sx={[{ ...calloutSx(tone), p: 1 }, sx]}>
      <WeatherSummary weather={clock.weather} intensity={clock.intensity} dense />
      {showDate || timed ? (
        <Stack direction="row" spacing={1} sx={FOOTER_SX}>
          {showDate ? <Typography sx={DATE_SX}>{formatCampaignDateTime(clock)}</Typography> : null}
          {timed ? (
            <Typography sx={{ ...TIMER_SX, color: clock.season ? 'text.secondary' : 'text.disabled' }}>
              {weatherTimerLabel(clock.season, clock.nextWeatherIn, clock.hoursSinceWeather)}
            </Typography>
          ) : null}
        </Stack>
      ) : null}
    </Box>
  );
}

const FOOTER_SX = Object.freeze({ justifyContent: 'space-between', mt: 0.5 });
const DATE_SX = Object.freeze({ color: 'text.primary', fontSize: FONT_SIZES.md });
const TIMER_SX = Object.freeze({ fontSize: FONT_SIZES.sm });
