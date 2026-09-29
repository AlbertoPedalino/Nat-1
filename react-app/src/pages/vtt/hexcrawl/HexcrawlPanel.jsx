import {
  Box, Button, FormControlLabel, Stack, Switch, Typography, alpha, useTheme,
} from '@mui/material';
import {
  CalendarDays, Compass, Dices, Footprints, Rabbit, Swords,
} from 'lucide-react';
import InfoHint from '../../../shared/ui/InfoHint.jsx';
import { VTT_COLORS, vttAlpha } from '../../../shared/vtt/colors.js';
import {
  advanceMinutes, formatDate, formatDateTime, formatDuration, formatHM,
} from '../../gmboard/session/time.js';
import {
  hasWeatherDisadvantage, travelTime, weatherEffectLabel, weatherTimerLabel,
} from '../../gmboard/session/weather.js';
import { MOUNT_OPTIONS, normalizeMountSpeed } from '../../gmboard/state/constants.js';
import {
  FALLBACK_WEATHER_ICON, POPULATION_ICONS, SEASON_ICONS, TERRAIN_ICONS, WEATHER_ICONS,
} from '../../gmboard/hexcrawl/hexIcons.js';
import {
  mergeBoardClock, missingHexSetup, populationOption, terrainOption, tierOption,
} from '../../../shared/hexcrawl/hexEntry.js';

// The hexcrawl as it stands, in the corner where the map's other settings live.
//
// A report, not a form: what time it is, what the sky is doing, what the next
// click will cost, and where the party last walked. The one control kept here is
// whether a click walks the party at all — it is flipped mid-session, while
// everything else is set once in the settings dialog behind the gear.
export default function HexcrawlPanel({
  board, clock, clockLinked, defaults, armed, error, lastHex, hasResult,
  onArmedChange, onOpenResult, onOpenSettings,
}) {
  const theme = useTheme();
  const boardState = board?.state ? mergeBoardClock(board.state, clock) : null;
  // The clock as the next click will read it: the campaign row laid over the
  // board, or the row alone while the board is still loading. A campaign that
  // has never been written still has a date — the board's — and it is the one
  // its first write will seed.
  const sky = boardState || clock;
  // Measured against the defaults, because those are what a clicked hex will be
  // rolled with. Said here rather than after the click, where it would be a
  // refusal instead of a setup step.
  const missing = boardState ? missingHexSetup(defaults, boardState) : null;
  const mountSpeed = normalizeMountSpeed(defaults?.mountSpeed ?? boardState?.mountSpeed ?? 1);

  return (
    <Stack spacing={1.1}>
      {sky ? <WeatherCard clock={sky} /> : null}

      <NextHexLine terrain={defaults?.terrain} clock={sky} mountSpeed={mountSpeed} />

      <SetupSummary
        season={boardState?.season || null}
        defaults={defaults}
        mountSpeed={mountSpeed}
        tones={theme.palette.gmboard.tier}
      />

      {/* Off while a map is being drawn up: laying out terrain would otherwise
          cost the party a day of travel per click. */}
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
          campaign under Links.
        </Typography>
      ) : null}
      {board && !clockLinked ? (
        <Typography sx={warnSx}>
          The campaign clock is not readable from here, so time will not be saved.
        </Typography>
      ) : null}
      {error ? <Typography sx={warnSx}>{error}</Typography> : null}

      {missing?.length && board ? (
        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <Typography sx={hintSx}>Set {missing.join(', ')} before walking into a hex.</Typography>
          {onOpenSettings ? (
            <Button size="small" sx={linkButtonSx} onClick={onOpenSettings}>Open settings</Button>
          ) : null}
        </Stack>
      ) : null}

      {/* Last: it is the answer to what has already been done, and the report
          above it is what the next click will use. */}
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

// How long the next click will take, before it is clicked. The bubble says it
// afterwards, which is too late to decide whether the party makes camp first.
function NextHexLine({ terrain, clock, mountSpeed }) {
  const option = terrainOption(terrain);
  if (!option) {
    return <Typography sx={hintSx}>Next hex: pick a terrain to see how long it takes.</Typography>;
  }
  const travel = travelTime(option.hours, clock?.meteo, clock?.intensity, mountSpeed);
  const Icon = TERRAIN_ICONS[option.id] || Footprints;
  const timed = clock && Number.isFinite(clock.min) && clock.day && clock.month && clock.year;
  const arrival = timed ? advanceMinutes(clock, travel.hours) : null;
  const nextDay = arrival
    && (arrival.day !== clock.day || arrival.month !== clock.month || arrival.year !== clock.year);

  return (
    <Box sx={nextHexSx}>
      <Icon size={16} color={VTT_COLORS.gold} />
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography sx={nextHexTitleSx}>Next hex · {formatDuration(travel.hours)}</Typography>
        <Typography sx={effectSx}>
          {option.label} {formatDuration(travel.base)}
          {travel.reasons.length ? ` → ${formatDuration(travel.hours)} (${travel.reasons.join(', ')})` : ''}
        </Typography>
        {arrival ? (
          <Typography sx={effectSx}>
            Arrive {formatHM(arrival.min)}{nextDay ? `, ${formatDate(arrival)}` : ''}
          </Typography>
        ) : null}
      </Box>
      <InfoHint
        label="About travel time"
        text="Measured for the default terrain; a hex with a terrain of its own takes that terrain's hours. The weather now sets the pace, even if it turns on the way."
      />
    </Box>
  );
}

// What an untouched hex will be rolled as, in one line of chips. Changing any of
// it is the settings dialog's job; reading it is this line's.
function SetupSummary({ season, defaults, mountSpeed, tones }) {
  const population = populationOption(defaults?.pop);
  const tier = tierOption(defaults?.tier);
  const mount = MOUNT_OPTIONS.find((option) => option.speed === mountSpeed);
  const tierTone = tier ? tones[tier.tier] : null;

  // The same icons the settings dialog and the GM Board use for each choice, so
  // the chip reads as the button it was picked from.
  return (
    <Box sx={chipRowSx} aria-label="Hexcrawl setup">
      <Chip
        icon={(season && SEASON_ICONS[season]) || CalendarDays}
        label={season || 'No season'}
        missing={!season}
      />
      <Chip
        icon={(population && POPULATION_ICONS[population.id]) || Compass}
        label={population?.label || 'No population'}
        missing={!population}
      />
      <Chip
        icon={Swords}
        label={tier ? `${tier.shortLabel} · ${tier.shortLevels}` : 'No tier'}
        missing={!tier}
        tone={tierTone?.color}
      />
      <Chip
        icon={mountSpeed === 1 ? Footprints : Rabbit}
        label={mount ? mount.label : `×${mountSpeed} mount`}
      />
    </Box>
  );
}

function Chip({ icon: Icon, label, missing = false, tone = null }) {
  return (
    <Box
      component="span"
      sx={{
        ...chipSx,
        ...(tone ? { color: tone, borderColor: alpha(tone, 0.6) } : null),
        ...(missing ? missingChipSx : null),
      }}
    >
      {Icon ? <Icon size={12} aria-hidden /> : null}
      {label}
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
        <Box sx={{ pt: 0.2 }}><TerrainIcon size={16} color={VTT_COLORS.gold} /></Box>
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

const hintSx = { color: VTT_COLORS.panelTextMuted, fontSize: '0.72rem', lineHeight: 1.45 };
const sectionSx = { color: VTT_COLORS.panelTextFaint, fontSize: '0.62rem', letterSpacing: '0.04em', mb: 0.5 };
const clockSx = { color: VTT_COLORS.panelText, fontSize: '0.72rem' };
const warnSx = { color: 'warning.main', fontSize: '0.66rem', lineHeight: 1.35 };

const cardSx = {
  p: 0.9,
  border: '1px solid',
  borderRadius: 1.5,
};

const weatherNameSx = { fontSize: '0.8rem', fontWeight: 700, lineHeight: 1.2 };
const effectSx = { color: 'text.secondary', fontSize: '0.66rem' };

const nextHexSx = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 0.9,
  p: 0.9,
  border: '1px solid',
  borderColor: vttAlpha(VTT_COLORS.gold, 0.35),
  borderRadius: 1.5,
  bgcolor: vttAlpha(VTT_COLORS.gold, 0.06),
};
const nextHexTitleSx = { fontSize: '0.8rem', fontWeight: 700, lineHeight: 1.2, color: VTT_COLORS.gold };

const chipRowSx = { display: 'flex', flexWrap: 'wrap', gap: 0.5 };

const chipSx = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 0.4,
  px: 0.75,
  py: 0.2,
  fontSize: '0.66rem',
  lineHeight: 1.4,
  color: VTT_COLORS.panelText,
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 1,
};

const missingChipSx = {
  color: 'warning.main',
  borderColor: 'warning.main',
  borderStyle: 'dashed',
};

const linkButtonSx = {
  px: 0.75,
  minWidth: 0,
  fontSize: '0.66rem',
  textTransform: 'none',
};

const lastCardSx = {
  p: 0.9,
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 1.5,
  bgcolor: vttAlpha(VTT_COLORS.black, 0.25),
};

const lastHexSx = {
  fontFamily: '"Cinzel", Georgia, serif',
  fontSize: '0.68rem',
  letterSpacing: '0.04em',
  color: VTT_COLORS.panelText,
};

const lastHeadlineSx = { fontSize: '0.8rem', fontWeight: 700, color: VTT_COLORS.gold, lineHeight: 1.3 };
const lastLineSx = { fontSize: '0.7rem', color: 'text.primary', lineHeight: 1.4 };
const lastMetaSx = { fontSize: '0.64rem', color: 'text.secondary', lineHeight: 1.4 };

const lastButtonSx = {
  mt: 0.4,
  px: 0.75,
  minWidth: 0,
  fontSize: '0.66rem',
  textTransform: 'none',
};
