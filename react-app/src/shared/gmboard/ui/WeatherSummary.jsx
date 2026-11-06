import { Box, Stack, Typography, useTheme } from '@mui/material';
import { weatherIcon } from '../../hexcrawl/hexIcons.js';
import { hasWeatherDisadvantage, weatherEffectLabel, weatherName, weatherTone } from '../weather.js';

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
        <Typography sx={{ fontSize: dense ? '0.8rem' : '0.85rem', fontWeight: 700, lineHeight: 1.2, color: tone }}>
          {weatherName(weather, intensity)}
        </Typography>
        <Typography sx={{ fontSize: dense ? '0.66rem' : '0.72rem', color: disadvantage ? 'warning.main' : 'text.secondary' }}>
          {weatherEffectLabel(weather, intensity)}
        </Typography>
      </Box>
    </Stack>
  );
}
