import { useEffect, useState } from 'react';
import { Box, Button, Stack, TextField, Typography, useTheme } from '@mui/material';
import { CalendarDays, Check, Clock, Compass, FastForward } from 'lucide-react';
import { useGmBoard } from '../state/GmBoardContext.jsx';
import { formatDate, formatHM, parseHM, validateStart } from '../logic/time.js';
import { effectiveHours } from '../logic/weather.js';

export default function TimePanel() {
  const { state, setStart, setTime, advanceManual } = useGmBoard();
  const theme = useTheme();
  const [day, setDay] = useState(String(state.day));
  const [month, setMonth] = useState(String(state.month));
  const [year, setYear] = useState(String(state.year));
  const [startTime, setStartTime] = useState(formatHM(state.min));
  const [curTime, setCurTime] = useState(formatHM(state.min));
  const [manualHours, setManualHours] = useState('1');
  const [startError, setStartError] = useState('');
  const [timeError, setTimeError] = useState('');

  // Restored/advanced state must be reflected in the entry fields, not just
  // the read-only header, or the next "Set start"/"Set time" silently reverts it.
  useEffect(() => {
    setDay(String(state.day));
    setMonth(String(state.month));
    setYear(String(state.year));
    setStartTime(formatHM(state.min));
    setCurTime(formatHM(state.min));
  }, [state.day, state.month, state.year, state.min]);

  const handleSetStart = () => {
    const parsed = validateStart({ day, month, year, time: startTime });
    if (!parsed) {
      setStartError('Invalid date or time.');
      return;
    }
    setStartError('');
    setStart(parsed);
  };

  const handleSetTime = () => {
    const min = parseHM(curTime);
    if (min == null) {
      setTimeError('Invalid time.');
      return;
    }
    setTimeError('');
    setTime(min);
  };

  const handleManualAdvance = () => {
    advanceManual(manualHours);
  };

  const effH = state.terrain
    ? effectiveHours(state.terrainH, state.meteo, state.intensity, state.mountSpeed)
    : 0;
  // Says which of the two moved the number, because they pull opposite ways: a
  // mount in heavy snow can land back on the terrain's own hours.
  const reasons = [
    effectiveHours(state.terrainH, state.meteo, state.intensity) !== state.terrainH ? 'weather' : null,
    Number(state.mountSpeed) > 1 ? `×${state.mountSpeed} mount` : null,
  ].filter(Boolean);
  const terrainLabel = !state.terrain
    ? '— no terrain —'
    : effH === state.terrainH
      ? `${state.terrain} (${effH}h)`
      : `${state.terrain} (${state.terrainH}h → ${effH}h due to ${reasons.join(' and ')})`;

  return (
    <Stack spacing={1.5} sx={panelSx}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
        <CalendarDays size={14} color={theme.palette.primary.main} />
        <Typography sx={titleSx}>Date &amp; Time</Typography>
      </Box>
      <Box>
        <Box sx={clockDisplaySx}>
          <Box sx={dateBlockSx}>
            <Typography sx={clockLabelSx}>Current date</Typography>
            <Typography sx={dateSx}>{formatDate(state)}</Typography>
          </Box>
          <Box sx={timeBlockSx}>
            <Typography sx={clockLabelSx}>Current time</Typography>
            <Typography sx={bigTimeSx}>{formatHM(state.min)}</Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
          <Compass size={12} />
          <Typography sx={terrainSx}>{terrainLabel}</Typography>
        </Box>
      </Box>

      <Box sx={rowSx}>
        <TextField label="Time (HH:MM)" size="small" value={curTime} onChange={(e) => setCurTime(e.target.value)} sx={fieldSx} />
        <Button size="small" variant="outlined" startIcon={<Clock size={14} />} onClick={handleSetTime}>Set time</Button>
      </Box>
      {timeError ? <Typography sx={errorSx}>{timeError}</Typography> : null}

      <Box sx={rowSx}>
        <TextField label="Day" size="small" value={day} onChange={(e) => setDay(e.target.value)} sx={fieldSx} />
        <TextField label="Month" size="small" value={month} onChange={(e) => setMonth(e.target.value)} sx={fieldSx} />
        <TextField label="Year" size="small" value={year} onChange={(e) => setYear(e.target.value)} sx={fieldSx} />
        <TextField label="Time (HH:MM)" size="small" value={startTime} onChange={(e) => setStartTime(e.target.value)} sx={fieldSx} />
        <Button size="small" variant="outlined" startIcon={<Check size={14} />} onClick={handleSetStart}>Set start</Button>
      </Box>
      {startError ? <Typography sx={errorSx}>{startError}</Typography> : null}

      <Box sx={rowSx}>
        <TextField
          label="Advance hours"
          size="small"
          value={manualHours}
          onChange={(e) => setManualHours(e.target.value)}
          sx={fieldSx}
        />
        <Button size="small" variant="outlined" startIcon={<FastForward size={14} />} onClick={handleManualAdvance}>Advance manually</Button>
        <Button size="small" variant="text" onClick={() => advanceManual(1)}>+1h</Button>
        <Button size="small" variant="text" onClick={() => advanceManual(4)}>+4h</Button>
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

const dateSx = {
  fontFamily: '"Cinzel", Georgia, serif',
  fontSize: { xs: '1.12rem', sm: '1.35rem' },
  fontWeight: 700,
  lineHeight: 1.25,
  color: 'primary.main',
};

const clockDisplaySx = {
  display: 'flex',
  flexDirection: { xs: 'column', sm: 'row' },
  alignItems: { xs: 'stretch', sm: 'center' },
  gap: { xs: 1, sm: 2 },
  mb: 0.75,
  p: 1.25,
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 2,
  bgcolor: 'rgba(237, 212, 138, 0.045)',
};

const dateBlockSx = {
  flex: 1,
  minWidth: 0,
};

const timeBlockSx = {
  flexShrink: 0,
  minWidth: { sm: 140 },
  pt: { xs: 1, sm: 0 },
  pl: { xs: 0, sm: 2 },
  borderTop: { xs: '1px solid', sm: 0 },
  borderLeft: { xs: 0, sm: '1px solid' },
  borderColor: 'divider',
};

const clockLabelSx = {
  mb: 0.25,
  fontSize: '0.58rem',
  fontWeight: 700,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'text.secondary',
};

const bigTimeSx = {
  fontFamily: '"Cinzel", Georgia, serif',
  fontSize: { xs: '1.8rem', sm: '2.2rem' },
  fontWeight: 700,
  lineHeight: 1.1,
  color: 'text.primary',
};

const terrainSx = {
  fontSize: '0.76rem',
  color: 'primary.main',
};

const rowSx = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 1,
  alignItems: 'center',
};

const fieldSx = {
  width: { xs: '100%', sm: '110px' },
};

const errorSx = {
  fontSize: '0.72rem',
  color: 'error.main',
};
