import { Box, Stack, Typography, useTheme } from '@mui/material';
import SelectorGroup from '../../../shared/gmboard/ui/SelectorGroup.jsx';
import { SEASON_ICONS, WEATHER_ICONS } from '../../../shared/hexcrawl/hexIcons.js';
import { SELECTOR_CONTRACTS } from '../../../shared/gmboard/ui/selectorContracts.js';
import { weatherTimerLabel, weatherTone } from '../../../shared/gmboard/weather.js';
import WeatherSummary from '../../../shared/gmboard/ui/WeatherSummary.jsx';
import { useGmBoard } from '../state/GmBoardContext.jsx';
import { UI_FONTS } from '../../../shared/ui/fonts.js';

export default function WeatherPanel() {
  const { state, setSeason, setWeatherOverride } = useGmBoard();
  const theme = useTheme();
  const seasonContract = SELECTOR_CONTRACTS.season;
  const weatherContract = SELECTOR_CONTRACTS.weatherOverride;

  const tone = weatherTone(theme.palette, state.weather);
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
          onChange={(o) => setSeason(o.id)}
          getIcon={(o) => SEASON_ICONS[o.id]}
        />
        <SelectorGroup
          label="Weather override"
          options={weatherContract.options}
          getId={weatherContract.getId}
          value={weatherContract.deriveValue(state)}
          onChange={(o) => setWeatherOverride({ weather: o.weather, intensity: o.intensity })}
          getIcon={(o) => WEATHER_ICONS[o.weather]}
        />
      </Box>
      <Box sx={{ ...displayCardSx, borderColor: tone, bgcolor: theme.palette.gmboard.panelOverlay }}>
        <WeatherSummary weather={state.weather} intensity={state.intensity} />
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
  fontFamily: UI_FONTS.display,
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

const timerSx = {
  fontSize: '0.75rem',
};
