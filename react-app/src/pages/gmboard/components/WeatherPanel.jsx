import { Box, Stack, Typography, useTheme } from '@mui/material';
import { CloudRain, CloudSun, Flower2, LeafyGreen, Snowflake, Sun } from 'lucide-react';
import SelectorGroup from './SelectorGroup.jsx';
import { SELECTOR_CONTRACTS } from '../logic/selectorContracts.js';
import { weatherEffectLabel, weatherTimerLabel } from '../logic/weather.js';
import { useGmBoard } from '../state/GmBoardContext.jsx';

const SEASON_ICONS = { Spring: Flower2, Summer: Sun, Autumn: LeafyGreen, Winter: Snowflake };
const WEATHER_ICONS = { Clear: Sun, Rain: CloudRain, Snow: Snowflake };

export default function WeatherPanel() {
  const { state, dispatch } = useGmBoard();
  const theme = useTheme();
  const seasonContract = SELECTOR_CONTRACTS.season;
  const weatherContract = SELECTOR_CONTRACTS.weatherOverride;

  const WeatherIcon = WEATHER_ICONS[state.meteo] || CloudSun;
  const weatherTone = theme.palette.gmboard.weather[state.meteo] || theme.palette.gmboard.weather.Clear;
  const timerLabel = weatherTimerLabel(state.season, state.nextWeatherIn, state.hoursSinceWeather);

  return (
    <Stack spacing={1.5} sx={panelSx}>
      <Typography sx={titleSx}>Season &amp; Weather</Typography>
      <Box sx={gridSx}>
        <SelectorGroup
          label="Season"
          options={seasonContract.options}
          getId={seasonContract.getId}
          value={seasonContract.deriveValue(state)}
          onChange={(o) => dispatch(seasonContract.action(o))}
          getIcon={(o) => SEASON_ICONS[o.id]}
        />
        <SelectorGroup
          label="Weather override"
          options={weatherContract.options}
          getId={weatherContract.getId}
          value={weatherContract.deriveValue(state)}
          onChange={(o) => dispatch(weatherContract.action(o))}
          getIcon={(o) => WEATHER_ICONS[o.meteo]}
        />
      </Box>
      <Box sx={{ ...displayCardSx, borderColor: weatherTone, bgcolor: theme.palette.gmboard.panelOverlay }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <WeatherIcon size={20} color={weatherTone} />
          <Box>
            <Typography sx={{ ...weatherNameSx, color: weatherTone }}>
              {state.meteo}{state.intensity ? ` · ${state.intensity}` : ''}
            </Typography>
            <Typography sx={effectSx}>{weatherEffectLabel(state.meteo, state.intensity)}</Typography>
          </Box>
        </Box>
        <Typography sx={{ ...timerSx, color: state.season ? 'text.secondary' : 'text.disabled' }}>
          {timerLabel}
        </Typography>
      </Box>
    </Stack>
  );
}

const panelSx = {
  p: 1.5,
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 2,
  bgcolor: 'background.paper',
};

const titleSx = {
  fontFamily: '"Cinzel", Georgia, serif',
  fontSize: '0.8rem',
  letterSpacing: '0.06em',
  color: 'primary.main',
};

const gridSx = {
  display: 'grid',
  gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
  gap: 1.25,
};

const displayCardSx = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  flexWrap: 'wrap',
  gap: 1,
  p: 1,
  border: '1px solid',
  borderRadius: 1.5,
};

const weatherNameSx = {
  fontSize: '0.85rem',
  fontWeight: 700,
  lineHeight: 1.2,
};

const effectSx = {
  fontSize: '0.72rem',
  color: 'text.secondary',
};

const timerSx = {
  fontSize: '0.75rem',
};
