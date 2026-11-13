import { useEffect, useState } from 'react';
import { Box, Button, Stack, TextField, Typography } from '@mui/material';
import { FastForward } from 'lucide-react';
import SelectorGroup from './SelectorGroup.jsx';
import { SELECTOR_CONTRACTS } from './selectorContracts.js';
import { MONTH_NAMES, formatHM, validateStart } from '../campaignTime.js';
import { SEASON_ICONS, WEATHER_ICONS } from '../../hexcrawl/hexIcons.js';
import { captionLabelSx } from '../../ui/PanelHeader.jsx';
import { FONT_SIZES } from '../../ui/fonts.js';
import { ICON_SIZES } from '../../ui/iconSizes.js';
import TipIconButton from '../../ui/TipIconButton.jsx';
import SelectField from '../../ui/SelectField.jsx';

// Everything about a campaign's calendar a GM sets by hand: the date and time
// together, hours that pass off the map, the season and a forced weather. The
// GM Board's clock dialog and the battle map's hexcrawl settings both show it.
//
// `clock` is { day, month, year, min, weather, intensity }. Each change goes
// out at once: onDateTime({ day, month, year, min }), onAdvance(hours),
// onSeason(id or null — picking the season it is in clears it),
// onWeather({ weather, intensity }). A missing handler hides its row.
//
// Button rows rather than dropdowns: a dropdown's menu is portalled to the
// page body, which a fullscreen map does not paint.
export default function CampaignCalendarFields({
  clock, season, disabled = false, onDateTime, onAdvance, onSeason, onWeather,
}) {
  const seasonContract = SELECTOR_CONTRACTS.season;
  const weatherContract = SELECTOR_CONTRACTS.weatherOverride;
  return (
    <Stack spacing={2}>
      {onDateTime ? <DateTimeForm clock={clock} disabled={disabled} onChange={onDateTime} /> : null}
      {onAdvance ? <AdvanceForm disabled={disabled} onAdvance={onAdvance} /> : null}
      {onSeason ? (
        <SelectorGroup
          label="Season"
          options={seasonContract.options}
          getId={seasonContract.getId}
          value={season || null}
          onChange={(option) => onSeason(option.id === season ? null : option.id)}
          getIcon={(option) => SEASON_ICONS[option.id]}
          disabled={disabled}
        />
      ) : null}
      {onWeather ? (
        <SelectorGroup
          label="Weather"
          options={weatherContract.options}
          getId={weatherContract.getId}
          value={weatherContract.deriveValue({ weather: clock.weather || 'Clear', intensity: clock.intensity || '' })}
          onChange={(option) => onWeather({ weather: option.weather, intensity: option.intensity })}
          getIcon={(option) => WEATHER_ICONS[option.weather]}
          disabled={disabled}
        />
      ) : null}
    </Stack>
  );
}

// Date and time together: a table jumping ahead a week lands at a particular
// hour, not at whatever the clock last read.
function DateTimeForm({ clock, disabled, onChange }) {
  const [day, setDay] = useState(String(clock.day ?? ''));
  const [month, setMonth] = useState(String(clock.month ?? 1));
  const [year, setYear] = useState(String(clock.year ?? ''));
  const [time, setTime] = useState(formatHM(clock.min ?? 0));
  const [dateError, setDateError] = useState('');

  // A hex entered meanwhile moves the clock; the fields follow it, or the next
  // "Set" would quietly put the party back where they were.
  useEffect(() => {
    setDay(String(clock.day ?? ''));
    setMonth(String(clock.month ?? 1));
    setYear(String(clock.year ?? ''));
    setTime(formatHM(clock.min ?? 0));
  }, [clock.day, clock.month, clock.year, clock.min]);

  const submit = () => {
    const parsed = validateStart({ day, month, year, time });
    if (!parsed) {
      setDateError('Invalid date or time.');
      return;
    }
    setDateError('');
    onChange(parsed);
  };
  const onEnter = (event) => { if (event.key === 'Enter') submit(); };

  return (
    <Box>
      <Typography sx={groupLabelSx}>Date &amp; time</Typography>
      <Box sx={dateRowSx}>
        <TextField
          size="small"
          label="Day"
          value={day}
          onChange={(event) => setDay(event.target.value)}
          onKeyDown={onEnter}
          disabled={disabled}
          slotProps={{ htmlInput: { inputMode: 'numeric' } }}
        />
        {/* Native, so its list opens inside a fullscreen map too. */}
        <SelectField
          native
          label="Month"
          value={month}
          onChange={setMonth}
          disabled={disabled}
          options={MONTH_OPTIONS}
          fullWidth={false}
        />
        <TextField
          size="small"
          label="Year"
          value={year}
          onChange={(event) => setYear(event.target.value)}
          onKeyDown={onEnter}
          disabled={disabled}
          slotProps={{ htmlInput: { inputMode: 'numeric' } }}
        />
        <TextField
          size="small"
          label="Time (HH:MM)"
          value={time}
          onChange={(event) => setTime(event.target.value)}
          onKeyDown={onEnter}
          disabled={disabled}
        />
        <Button variant="outlined" size="small" disabled={disabled} onClick={submit}>Set</Button>
      </Box>
      {dateError ? <Typography sx={errorSx}>{dateError}</Typography> : null}
    </Box>
  );
}

const MONTH_OPTIONS = MONTH_NAMES.map((name, index) => ({ value: String(index + 1), label: name }));

// The quick steps of time passing, shared with the GM Board's clock bar.
export const QUICK_HOURS = Object.freeze([1, 4, 8, 24]);

// Hours that pass off the map — a rest, a siege, a day in town.
function AdvanceForm({ disabled, onAdvance }) {
  const [hours, setHours] = useState('1');
  const valid = Number(hours) > 0;
  const advance = (amount) => { if (Number(amount) > 0) onAdvance(Number(amount)); };

  return (
    <Box>
      <Typography sx={groupLabelSx}>Let time pass · the weather keeps rolling</Typography>
      <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 0.75 }}>
        {QUICK_HOURS.map((amount) => (
          <Button
            key={amount}
            size="small"
            variant="outlined"
            color="inherit"
            disabled={disabled}
            onClick={() => advance(amount)}
            sx={quickButtonSx}
          >
            +{amount}h
          </Button>
        ))}
        <TextField
          size="small"
          label="Hours"
          value={hours}
          onChange={(event) => setHours(event.target.value)}
          onKeyDown={(event) => { if (event.key === 'Enter') advance(hours); }}
          disabled={disabled}
          slotProps={{ htmlInput: { inputMode: 'decimal' } }}
          sx={{ width: 80 }}
        />
        <TipIconButton title="Advance by these hours" size="small" ariaLabel="Advance the clock" disabled={disabled || !valid} onClick={() => advance(hours)}>
          <FastForward size={ICON_SIZES.md} />
        </TipIconButton>
      </Stack>
    </Box>
  );
}

const groupLabelSx = { ...captionLabelSx, mb: 0.5 };

const dateRowSx = {
  display: 'grid',
  gridTemplateColumns: { xs: '64px 1fr 80px', sm: '64px 1fr 80px 110px auto' },
  gap: 0.75,
  alignItems: 'center',
  '& > :nth-of-type(4)': { gridColumn: { xs: '1 / 3', sm: 'auto' } },
};

const errorSx = { color: 'error.main', fontSize: FONT_SIZES.md, mt: 0.5 };

export const quickButtonSx = { minWidth: 0, px: 1, fontSize: FONT_SIZES.md };
