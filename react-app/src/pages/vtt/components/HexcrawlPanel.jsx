import {
  Box, Button, FormControlLabel, MenuItem, Stack, Switch, TextField, Typography, alpha, useTheme,
} from '@mui/material';
import { Dices, Footprints } from 'lucide-react';
import ColorField from '../../../components/ColorField.jsx';
import MountSelector from '../../gmboard/components/MountSelector.jsx';
import InfoHint from '../../../components/InfoHint.jsx';
import { formatDateTime } from '../../gmboard/logic/time.js';
import { hasWeatherDisadvantage, weatherEffectLabel, weatherTimerLabel } from '../../gmboard/logic/weather.js';
import {
  HEX_POPULATION_OPTIONS, SEASONS, TERRAIN_OPTIONS, TIER_OPTIONS,
} from '../../gmboard/logic/constants.js';
import {
  FALLBACK_WEATHER_ICON, POPULATION_ICONS, SEASON_ICONS, TERRAIN_ICONS, WEATHER_ICONS,
} from '../../gmboard/components/hexIcons.js';
import { mergeBoardClock, missingHexSetup, terrainOption } from '../../../shared/hexcrawl/hexEntry.js';
import { DEFAULT_GRID } from '../../../shared/vtt/scene.js';

const DEFAULT_HEX_COLOR = DEFAULT_GRID.hexColor;

// The hexcrawl's settings, in the corner where the map's other settings live.
//
// Set up once — season, and what a hex is — and after that a click on the board
// is the whole interaction: the party walks in, the engine rolls, and the answer
// comes back as a dialog. There is deliberately no per-hex form here: filling
// one in before every click is the tedium this replaces.
//
// It reads as the GM Board's Travel panel does — weather card, icons per
// option, tier in its own colour — because it is the same hexcrawl, and a GM
// moves between the two screens in the middle of a leg.
export default function HexcrawlPanel({
  board, clock, clockLinked, defaults, armed, busy, error, lastHex, hasResult,
  hexColor, onHexColorChange,
  onDefaultsChange, onSeasonChange, onArmedChange, onOpenResult,
}) {
  const theme = useTheme();
  const boardState = board?.state ? mergeBoardClock(board.state, clock) : null;
  const season = clock?.season || boardState?.season || '';
  // Measured against the defaults, because those are what a clicked hex will be
  // rolled with. Said here rather than after the click, where it would be a
  // refusal instead of a setup step.
  const missing = boardState ? missingHexSetup(defaults, boardState) : null;

  return (
    <Stack spacing={1.1}>
      {clock ? <WeatherCard clock={clock} /> : null}

      <TextField
        select
        size="small"
        label="Season"
        value={season}
        onChange={(event) => onSeasonChange(event.target.value || null)}
        disabled={busy || !clockLinked}
      >
        <MenuItem value="">Not set</MenuItem>
        {SEASONS.map((option) => (
          <MenuItem key={option} value={option}>
            <OptionRow icon={SEASON_ICONS[option]} label={option} />
          </MenuItem>
        ))}
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
          <MenuItem key={option.id} value={option.label}>
            <OptionRow icon={TERRAIN_ICONS[option.id]} label={option.label} sub={option.sub} />
          </MenuItem>
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
          <MenuItem key={option.id} value={option.id}>
            <OptionRow icon={POPULATION_ICONS[option.id]} label={option.label} sub={option.sub} />
          </MenuItem>
        ))}
      </TextField>

      {/* The tier is the one setting with a colour of its own on the GM Board,
          and it keeps it here: it is read at a glance mid-fight, not browsed. */}
      <TierRow
        value={defaults?.tier ?? null}
        busy={busy}
        tones={theme.palette.gmboard.tier}
        onChange={(tier) => onDefaultsChange({ tier })}
      />

      {/* The party's own speed rather than the hex's: it crosses every hex the
          same amount faster. Set here it is this map's, and the board's answer
          is used until it is. */}
      <MountSelector
        dense
        label="Mount"
        disabled={busy}
        value={defaults?.mountSpeed ?? boardState?.mountSpeed ?? 1}
        onChange={(mountSpeed) => onDefaultsChange({ mountSpeed })}
      />

      {/* Off while a map is being drawn up: laying out terrain would otherwise
          cost the party a day of travel per click. What a click does is behind
          the icon rather than spelled out under it: the panel sits on the map,
          so every line of prose is a line of map, and this one is read once. */}
      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
        <FormControlLabel
          sx={{ mr: 0 }}
          control={(
            <Switch
              size="small"
              checked={Boolean(armed)}
              onChange={(event) => onArmedChange(event.target.checked)}
            />
          )}
          label={<Typography variant="body2">Clicking a hex enters it and rolls</Typography>}
        />
        <InfoHint
          label="About clicking a hex"
          text="Click a hex to walk the party into it. Click a visited one to take the visit back — its terrain stays, the hours already played do not come back."
        />
      </Stack>

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
      ) : null}

      {/* The colour of the country the party has walked. A green wash reads as
          forest on one map and as nothing at all on another, so it is the GM's
          to pick — and it is kept on the scene, where the players and the
          projector read it too. */}
      {onHexColorChange ? (
        <Box>
          <Typography sx={sectionSx}>Explored hex colour</Typography>
          <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
            {/* The same deferred well the grid's own colour uses: a controlled
                colour input re-renders on every move inside the picker and
                snaps the widget away from the pointer. */}
            <ColorField
              value={hexColor || DEFAULT_HEX_COLOR}
              onChange={onHexColorChange}
              deferMs={180}
              label="Explored hex colour"
              sx={swatchSx}
            />
            <Typography sx={hintSx}>{hexColor || DEFAULT_HEX_COLOR}</Typography>
            {(hexColor || DEFAULT_HEX_COLOR) !== DEFAULT_HEX_COLOR ? (
              <Button
                size="small"
                sx={lastButtonSx}
                onClick={() => onHexColorChange(DEFAULT_HEX_COLOR)}
              >
                Reset
              </Button>
            ) : null}
          </Stack>
        </Box>
      ) : null}

      {/* Last, under the settings: it is the answer to what has already been
          done, and the setup above it is what the next click will use. */}
      {lastHex ? (
        <LastHexCard
          last={lastHex}
          onOpenResult={hasResult && lastHex.fromThisSession ? onOpenResult : null}
        />
      ) : null}
    </Stack>
  );
}

// The weather the next click will be rolled under, said the way the GM Board
// says it: the condition first, what it costs second.
function WeatherCard({ clock }) {
  const theme = useTheme();
  const tone = theme.palette.gmboard.weather[clock.meteo] || theme.palette.gmboard.weather.Clear;
  const Icon = WEATHER_ICONS[clock.meteo] || FALLBACK_WEATHER_ICON;
  const disadvantage = hasWeatherDisadvantage(clock.meteo, clock.intensity);
  // A clock row that predates the weather counters has neither, and a countdown
  // to nowhere is worse than no countdown.
  const timed = clock.season
    && Number.isFinite(clock.nextWeatherIn)
    && Number.isFinite(clock.hoursSinceWeather);

  return (
    <Box sx={{ ...cardSx, borderColor: alpha(tone, 0.55), bgcolor: alpha(tone, 0.08) }}>
      <Stack direction="row" spacing={0.9} sx={{ alignItems: 'center' }}>
        <Icon size={20} color={tone} />
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ ...weatherNameSx, color: tone }}>
            {clock.meteo}{clock.intensity ? ` · ${clock.intensity}` : ''}
          </Typography>
          {/* The cost is said once, in the effect line, and turns amber when it
              is the party's rolls that pay it. */}
          <Typography sx={[effectSx, disadvantage && { color: 'warning.main' }]}>
            {weatherEffectLabel(clock.meteo, clock.intensity)}
          </Typography>
        </Box>
      </Stack>
      <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between', mt: 0.6 }}>
        <Typography sx={clockSx}>{formatDateTime(clock)}</Typography>
        {timed ? (
          <Typography sx={effectSx}>
            {weatherTimerLabel(clock.season, clock.nextWeatherIn, clock.hoursSinceWeather)}
          </Typography>
        ) : null}
      </Stack>
    </Box>
  );
}

// Where the party stands, and what the hex did to them on the way in. The
// bubble over the map says this once and fades; a GM who looked away, or who
// opened the panel an hour later, still has to know where everyone is.
function LastHexCard({ last, onOpenResult }) {
  const terrain = terrainOption(last.hex?.terrain);
  const TerrainIcon = terrain ? TERRAIN_ICONS[terrain.id] : Footprints;

  return (
    <Box sx={lastCardSx}>
      <Typography sx={sectionSx}>Last hex visited</Typography>
      <Stack direction="row" spacing={0.8} sx={{ alignItems: 'flex-start' }}>
        <Box sx={{ pt: 0.2 }}><TerrainIcon size={16} color="#e8c96a" /></Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography sx={lastHexSx}>
            Hex {last.hex.q}, {last.hex.r}
            {terrain ? ` · ${terrain.label} (${last.travelHours ?? terrain.hours}h)` : ''}
          </Typography>
          {last.headline ? <Typography sx={lastHeadlineSx}>{last.headline}</Typography> : null}
          {(last.lines || []).map((line) => (
            <Typography key={line} sx={lastLineSx}>{line}</Typography>
          ))}
          {last.clock ? (
            <Typography sx={lastMetaSx}>
              {formatDateTime(last.clock)}
              {last.clock.meteo ? ` · ${last.clock.meteo}${last.clock.intensity ? ` ${last.clock.intensity}` : ''}` : ''}
            </Typography>
          ) : null}
          {/* A hex remembered from the campaign row rather than rolled here: the
              coordinates are true, the rolls belong to whoever made them. */}
          {!last.fromThisSession ? (
            <Typography sx={lastMetaSx}>
              {last.onThisScene ? 'Entered before this session.' : 'Entered on another map.'}
            </Typography>
          ) : null}
          {onOpenResult ? (
            <Button size="small" sx={lastButtonSx} startIcon={<Dices size={13} />} onClick={onOpenResult}>
              See the rolls
            </Button>
          ) : null}
        </Box>
      </Stack>
    </Box>
  );
}

// Four buttons rather than a fifth dropdown: the tier is the one field a GM
// changes between parties, and its colour is how the board says how hard the
// hex is about to be.
function TierRow({ value, tones, busy, onChange }) {
  return (
    <Box>
      <Typography sx={sectionSx}>Encounter tier</Typography>
      <Box role="group" aria-label="Encounter tier" sx={tierRowSx}>
        {TIER_OPTIONS.map((option) => {
          const selected = value === option.tier;
          const tone = tones[option.tier];
          return (
            <Box
              component="button"
              type="button"
              key={option.tier}
              disabled={busy}
              aria-pressed={selected}
              // Clicking the tier it is already on clears it, so a map can be
              // laid out without claiming a difficulty it has not been given.
              onClick={() => onChange(selected ? null : option.tier)}
              sx={{
                ...tierButtonSx,
                borderColor: selected ? tone.color : tone.dim,
                color: selected ? tone.color : tone.dim,
                bgcolor: selected ? alpha(tone.color, 0.16) : 'transparent',
                '&:hover:not(:disabled)': { borderColor: tone.color, bgcolor: alpha(tone.color, 0.1) },
              }}
            >
              <Box component="span" sx={{ fontWeight: 700 }}>{option.shortLabel}</Box>
              <Box component="span" sx={{ fontSize: '0.56rem', opacity: 0.85 }}>{option.shortLevels}</Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

function OptionRow({ icon: Icon, label, sub }) {
  return (
    <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', minWidth: 0 }}>
      {Icon ? <Icon size={14} /> : null}
      <Box component="span">{label}</Box>
      {sub ? <Box component="span" sx={optionSubSx}>{sub}</Box> : null}
    </Stack>
  );
}

const hintSx = { color: '#b9ad91', fontSize: '0.72rem', lineHeight: 1.45 };
const sectionSx = { color: '#9f947d', fontSize: '0.62rem', letterSpacing: '0.04em', mb: 0.5 };
const clockSx = { color: '#d9cfb8', fontSize: '0.72rem' };
const warnSx = { color: 'warning.main', fontSize: '0.66rem', lineHeight: 1.35 };
const optionSubSx = { color: 'text.secondary', fontSize: '0.68rem' };

const cardSx = {
  p: 0.9,
  border: '1px solid',
  borderRadius: 1.5,
};

const weatherNameSx = { fontSize: '0.8rem', fontWeight: 700, lineHeight: 1.2 };
const effectSx = { color: 'text.secondary', fontSize: '0.66rem' };

const tierRowSx = { display: 'flex', flexWrap: 'wrap', gap: 0.6 };

const swatchSx = {
  width: 34,
  height: 26,
  p: 0,
  border: '1px solid rgba(232,201,106,0.35)',
  borderRadius: 1,
  bgcolor: 'transparent',
  cursor: 'pointer',
  flexShrink: 0,
};

const lastCardSx = {
  p: 0.9,
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 1.5,
  bgcolor: 'rgba(0,0,0,0.25)',
};

const lastHexSx = {
  fontFamily: '"Cinzel", Georgia, serif',
  fontSize: '0.68rem',
  letterSpacing: '0.04em',
  color: '#d9cfb8',
};

const lastHeadlineSx = { fontSize: '0.8rem', fontWeight: 700, color: '#e8c96a', lineHeight: 1.3 };
const lastLineSx = { fontSize: '0.7rem', color: 'text.primary', lineHeight: 1.4 };
const lastMetaSx = { fontSize: '0.64rem', color: 'text.secondary', lineHeight: 1.4 };

const lastButtonSx = {
  mt: 0.4,
  px: 0.75,
  minWidth: 0,
  fontSize: '0.66rem',
  textTransform: 'none',
};

const tierButtonSx = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 0.1,
  flex: '1 1 60px',
  py: 0.5,
  px: 0.75,
  fontFamily: 'inherit',
  fontSize: '0.7rem',
  lineHeight: 1.2,
  border: '1px solid',
  borderRadius: 1,
  cursor: 'pointer',
  '&:disabled': { cursor: 'default', opacity: 0.5 },
  '&:focus-visible': { outline: '2px solid currentColor', outlineOffset: '1px' },
};
