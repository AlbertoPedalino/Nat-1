import { useState } from 'react';
import {
  Box, Button, Stack, Typography, useTheme,
} from '@mui/material';
import { CalendarDays, Pencil } from 'lucide-react';
import { useGmBoard } from '../state/GmBoardContext.jsx';
import { formatDate, formatHM } from '../../../shared/gmboard/campaignTime.js';
import { weatherTimerLabel, weatherTone } from '../../../shared/gmboard/weather.js';
import WeatherSummary from '../../../shared/gmboard/ui/WeatherSummary.jsx';
import CampaignCalendarFields, { QUICK_HOURS, quickButtonSx } from '../../../shared/gmboard/ui/CampaignCalendarFields.jsx';
import SheetDialog from '../../../shared/ui/SheetDialog.jsx';
import { UI_FONTS } from '../../../shared/ui/fonts.js';
import BoardPanel from '../ui/BoardPanel.jsx';

// The campaign's clock at a glance: date, time and weather in one strip, with
// the quick steps of time passing. Setting the date, the season or a forced
// weather is rarer, and lives behind Edit (the same calendar fields as the
// battle map's hexcrawl settings).
export default function ClockBar() {
  const {
    state, setStart, setSeason, setWeatherOverride, advanceManual,
  } = useGmBoard();
  const theme = useTheme();
  const [editing, setEditing] = useState(false);
  const tone = weatherTone(theme.palette, state.weather);

  return (
    <BoardPanel
      icon={CalendarDays}
      title="Clock & weather"
      actions={(
        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 0.5 }}>
          {QUICK_HOURS.slice(0, 3).map((hours) => (
            <Button key={hours} size="small" variant="outlined" color="inherit" onClick={() => advanceManual(hours)} sx={quickButtonSx}>
              +{hours}h
            </Button>
          ))}
          <Button size="small" variant="outlined" startIcon={<Pencil size={13} />} onClick={() => setEditing(true)}>
            Edit
          </Button>
        </Stack>
      )}
    >
      <Box sx={stripSx}>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={dateSx}>{formatDate(state)}</Typography>
          <Typography sx={timeSx}>{formatHM(state.min)}</Typography>
        </Box>
        <Box sx={{ ...weatherSx, borderColor: tone }}>
          <WeatherSummary weather={state.weather} intensity={state.intensity} dense />
          <Typography sx={{ ...timerSx, color: state.season ? 'text.secondary' : 'text.disabled' }}>
            {weatherTimerLabel(state.season, state.nextWeatherIn, state.hoursSinceWeather)}
          </Typography>
        </Box>
      </Box>

      <SheetDialog
        open={editing}
        onClose={() => setEditing(false)}
        maxWidth="sm"
        title="Clock & weather"
        icon={<CalendarDays size={18} />}
        actions={<Button onClick={() => setEditing(false)}>Done</Button>}
      >
        <CampaignCalendarFields
          clock={state}
          season={state.season}
          onDateTime={setStart}
          onAdvance={advanceManual}
          onSeason={setSeason}
          onWeather={setWeatherOverride}
        />
      </SheetDialog>
    </BoardPanel>
  );
}

const stripSx = {
  display: 'flex',
  flexDirection: { xs: 'column', sm: 'row' },
  alignItems: { xs: 'stretch', sm: 'center' },
  justifyContent: 'space-between',
  gap: 1.5,
};

const dateSx = {
  fontFamily: UI_FONTS.display,
  fontSize: { xs: '1.05rem', sm: '1.25rem' },
  fontWeight: 700,
  lineHeight: 1.25,
  color: 'primary.main',
};

const timeSx = {
  fontFamily: UI_FONTS.display,
  fontSize: { xs: '1.5rem', sm: '1.8rem' },
  fontWeight: 700,
  lineHeight: 1.1,
};

const weatherSx = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  flexWrap: 'wrap',
  gap: 1.5,
  p: 1,
  border: '1px solid',
  borderRadius: 1.5,
  minWidth: { sm: 280 },
};

const timerSx = { fontSize: '0.72rem' };
