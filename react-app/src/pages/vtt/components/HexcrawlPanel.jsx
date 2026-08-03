import {
  Box, FormControlLabel, MenuItem, Stack, Switch, TextField, Typography,
} from '@mui/material';
import { formatDateTime } from '../../gmboard/logic/time.js';
import { hasWeatherDisadvantage } from '../../gmboard/logic/weather.js';
import {
  HEX_POPULATION_OPTIONS, SEASONS, TERRAIN_OPTIONS, TIER_OPTIONS,
} from '../../gmboard/logic/constants.js';
import { mergeBoardClock, missingHexSetup } from '../../../shared/hexcrawl/hexEntry.js';

// The hexcrawl's settings, in the corner where the map's other settings live.
//
// Set up once — season, and what a hex is — and after that a click on the board
// is the whole interaction: the party walks in, the engine rolls, and the answer
// comes back as a dialog. There is deliberately no per-hex form here: filling
// one in before every click is the tedium this replaces.
export default function HexcrawlPanel({
  board, clock, clockLinked, defaults, armed, busy, error,
  onDefaultsChange, onSeasonChange, onArmedChange,
}) {
  const boardState = board?.state ? mergeBoardClock(board.state, clock) : null;
  const season = clock?.season || boardState?.season || '';
  // Measured against the defaults, because those are what a clicked hex will be
  // rolled with. Said here rather than after the click, where it would be a
  // refusal instead of a setup step.
  const missing = boardState ? missingHexSetup(defaults, boardState) : null;
  const disadvantage = clock ? hasWeatherDisadvantage(clock.meteo, clock.intensity) : false;

  return (
    <Stack spacing={1.1}>
      {clock ? (
        <Box>
          <Typography sx={clockSx}>{formatDateTime(clock)}</Typography>
          <Typography sx={weatherSx}>
            {clock.meteo}{clock.intensity ? ` · ${clock.intensity}` : ''}
            {disadvantage ? ' · disadvantage' : ''}
          </Typography>
        </Box>
      ) : null}

      <TextField
        select
        size="small"
        label="Season"
        value={season}
        onChange={(event) => onSeasonChange(event.target.value || null)}
        disabled={busy || !clockLinked}
      >
        <MenuItem value="">Not set</MenuItem>
        {SEASONS.map((option) => <MenuItem key={option} value={option}>{option}</MenuItem>)}
      </TextField>

      <Typography sx={sectionSx}>A hex is, unless it says otherwise</Typography>

      <TextField
        select
        size="small"
        label="Terrain"
        value={defaults?.terrain || ''}
        onChange={(event) => onDefaultsChange({ terrain: event.target.value || null })}
        disabled={busy}
      >
        <MenuItem value="">Not set</MenuItem>
        {TERRAIN_OPTIONS.map((option) => (
          <MenuItem key={option.id} value={option.label}>{option.label} · {option.sub}</MenuItem>
        ))}
      </TextField>

      <TextField
        select
        size="small"
        label="Population"
        value={defaults?.pop || ''}
        onChange={(event) => onDefaultsChange({ pop: event.target.value || null })}
        disabled={busy}
      >
        <MenuItem value="">Not set</MenuItem>
        {HEX_POPULATION_OPTIONS.map((option) => (
          <MenuItem key={option.id} value={option.id}>{option.label} · {option.sub}</MenuItem>
        ))}
      </TextField>

      <TextField
        select
        size="small"
        label="Encounter tier"
        value={defaults?.tier ?? ''}
        onChange={(event) => onDefaultsChange({
          tier: event.target.value === '' ? null : Number(event.target.value),
        })}
        disabled={busy}
      >
        <MenuItem value="">Not set</MenuItem>
        {TIER_OPTIONS.map((option) => (
          <MenuItem key={option.tier} value={option.tier}>{option.label} · {option.levels}</MenuItem>
        ))}
      </TextField>

      {/* Off while a map is being drawn up: laying out terrain would otherwise
          cost the party a day of travel per click. */}
      <FormControlLabel
        control={(
          <Switch
            size="small"
            checked={Boolean(armed)}
            onChange={(event) => onArmedChange(event.target.checked)}
          />
        )}
        label={<Typography variant="body2">Clicking a hex enters it and rolls</Typography>}
      />

      {!board ? (
        <Typography sx={warnSx}>
          No hexcrawl board is linked to this campaign. Open the GM Board, save it, and pick this
          campaign under Campaign.
        </Typography>
      ) : null}
      {board && !clockLinked ? (
        <Typography sx={warnSx}>
          The campaign clock is not readable from here, so time will not be saved.
        </Typography>
      ) : null}
      {error ? <Typography sx={warnSx}>{error}</Typography> : null}

      {missing?.length && board ? (
        <Typography sx={hintSx}>Set {missing.join(', ')} before walking into a hex.</Typography>
      ) : (
        <Typography sx={hintSx}>Click a hex to walk the party into it.</Typography>
      )}
    </Stack>
  );
}

const hintSx = { color: '#b9ad91', fontSize: '0.72rem', lineHeight: 1.45 };
const sectionSx = { color: '#9f947d', fontSize: '0.62rem', letterSpacing: '0.04em' };
const clockSx = { color: '#d9cfb8', fontSize: '0.72rem' };
const weatherSx = { color: '#b9ad91', fontSize: '0.66rem' };
const warnSx = { color: 'warning.main', fontSize: '0.66rem', lineHeight: 1.35 };
