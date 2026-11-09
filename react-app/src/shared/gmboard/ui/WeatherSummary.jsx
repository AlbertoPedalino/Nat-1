import { Box, Stack, Typography, useTheme } from '@mui/material';
import { weatherIcon } from '../../hexcrawl/hexIcons.js';
import { hasWeatherDisadvantage, weatherEffectLabel, weatherName, weatherTone } from '../weather.js';
import { FONT_SIZES } from '../../ui/fonts.js';

// The weather said the same way on the GM Board and on the map: the condition
// first, in its colour, then what it costs. The cost turns amber when it is the
// party's rolls that pay it.
export default function WeatherSummary({ weather, intensity, dense = false }) {
  const theme = useTheme();
  const tone = weatherTone(theme.palette, weather);
  const Icon = weatherIcon(weather);
  const disadvantage = hasWeatherDisadvantage(weather, intensity);
  return (
    <Stack direction="row" spacing={dense ? 0.9 : 0.75} sx={{ alignItems: 'center' }}>
      <Icon size={20} color={tone} />
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontSize: dense ? FONT_SIZES.xl : FONT_SIZES.xxl, fontWeight: 700, lineHeight: 1.2, color: tone }}>
          {weatherName(weather, intensity)}
        </Typography>
        <Typography sx={{ fontSize: dense ? FONT_SIZES.sm : FONT_SIZES.md, color: disadvantage ? 'warning.main' : 'text.secondary' }}>
          {weatherEffectLabel(weather, intensity)}
        </Typography>
      </Box>
    </Stack>
  );
}
