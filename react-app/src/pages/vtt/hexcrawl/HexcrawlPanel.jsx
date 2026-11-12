import {
  Box, Button, Stack, Typography, alpha, useTheme,
} from '@mui/material';
import {
  CalendarDays, Compass, Dices, Footprints, Rabbit, Swords,
} from 'lucide-react';
import InfoHint from '../../../shared/ui/InfoHint.jsx';
import { VTT_COLORS, vttAlpha } from '../../../shared/vtt/colors.js';
import {
  advanceMinutes, formatDate, formatCampaignDateTime, formatDuration, formatHM,
} from '../../../shared/gmboard/campaignTime.js';
import {
  travelLine, travelTime, weatherTimerLabel, weatherTone,
} from '../../../shared/gmboard/weather.js';
import { MOUNT_OPTIONS, normalizeMountSpeed } from '../../../shared/gmboard/boardOptions.js';
import {
  POPULATION_ICONS, SEASON_ICONS, TERRAIN_ICONS,
} from '../../../shared/hexcrawl/hexIcons.js';
import {
  mergeBoardClock, missingHexSetup, populationOption, terrainOption, tierOption,
} from '../../../shared/hexcrawl/hexEntry.js';
import { FONT_SIZES, FONT_WEIGHTS, LINE_HEIGHTS } from '../../../shared/ui/fonts.js';
import WeatherSummary from '../../../shared/gmboard/ui/WeatherSummary.jsx';
import { TEXT_STYLES } from '../../../shared/ui/textStyles.js';
import { OPACITY, UI_COLORS } from '../../../shared/ui/colors.js';
import { ICON_SIZES } from '../../../shared/ui/iconSizes.js';
import TagChip from '../../../shared/ui/TagChip.jsx';
import HexcrawlLinkWarnings from './HexcrawlLinkWarnings.jsx';
import Caption from '../../../shared/ui/Caption.jsx';
import ToggleRow from '../../../shared/ui/ToggleRow.jsx';
import MapSectionTitle from '../map/MapSectionTitle.jsx';
import { hexLabel } from './hexLabel.js';

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
    <Stack spacing={1}>
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
      <ToggleRow
        label="Clicking a hex enters it and rolls"
        checked={armed}
        onChange={onArmedChange}
        hint="Click a hex to walk the party into it. Click a visited one to take the visit back — its terrain stays, the hours already played do not come back."
        hintLabel="About clicking a hex"
      />

      <HexcrawlLinkWarnings board={board} clockLinked={clockLinked} error={error} />

      {missing?.length && board ? (
        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <Caption component="p" tone="warning">Set {missing.join(', ')} before walking into a hex.</Caption>
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
  const tone = weatherTone(theme.palette, clock.weather);
  // A clock row that predates the weather counters has neither, and a countdown
  // to nowhere is worse than no countdown.
  const timed = clock.season
    && Number.isFinite(clock.nextWeatherIn)
    && Number.isFinite(clock.hoursSinceWeather);

  return (
    <Box sx={{ ...cardSx, borderColor: alpha(tone, OPACITY.strong), bgcolor: alpha(tone, OPACITY.soft) }}>
      <WeatherSummary weather={clock.weather} intensity={clock.intensity} dense />
      <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between', mt: 0.5 }}>
        <Typography sx={clockSx}>{formatCampaignDateTime(clock)}</Typography>
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
    return <Caption component="p">Next hex: pick a terrain to see how long it takes.</Caption>;
  }
  const travel = travelTime(option.hours, clock?.weather, clock?.intensity, mountSpeed);
  const Icon = TERRAIN_ICONS[option.id] || Footprints;
  const timed = clock && Number.isFinite(clock.min) && clock.day && clock.month && clock.year;
  const arrival = timed ? advanceMinutes(clock, travel.hours) : null;
  const nextDay = arrival
    && (arrival.day !== clock.day || arrival.month !== clock.month || arrival.year !== clock.year);

  return (
    <Box sx={nextHexSx}>
      <Icon size={ICON_SIZES.md} color={VTT_COLORS.accent} />
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography sx={nextHexTitleSx}>Next hex · {formatDuration(travel.hours)}</Typography>
        <Typography sx={effectSx}>
          {travelLine(option.label, travel)}
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
      <SettingChip
        icon={(season && SEASON_ICONS[season]) || CalendarDays}
        label={season || 'No season'}
        missing={!season}
      />
      <SettingChip
        icon={(population && POPULATION_ICONS[population.id]) || Compass}
        label={population?.label || 'No population'}
        missing={!population}
      />
      <SettingChip
        icon={Swords}
        label={tier ? `${tier.shortLabel} · ${tier.shortLevels}` : 'No tier'}
        missing={!tier}
        tone={tierTone?.color}
      />
      <SettingChip
        icon={mountSpeed === 1 ? Footprints : Rabbit}
        label={mount ? mount.label : `×${mountSpeed} mount`}
      />
    </Box>
  );
}

// One of the hexcrawl's settings, as the sticker it was picked from; a setting
// not made yet stands out in the warning tone.
function SettingChip({ icon: Icon, label, missing = false, tone = null }) {
  return <TagChip icon={<Icon size={ICON_SIZES.xs} aria-hidden />} label={label} tone={missing ? UI_COLORS.warning : tone} />;
}

// Where the party stands, and what the hex did to them on the way in. The
// bubble over the map says this once and fades; a GM who looked away, or who
// opened the panel an hour later, still has to know where everyone is.
function LastHexCard({ last, onOpenResult }) {
  const terrain = terrainOption(last.hex?.terrain);
  const TerrainIcon = terrain ? TERRAIN_ICONS[terrain.id] : Footprints;

  return (
    <Box sx={lastCardSx}>
      <MapSectionTitle sx={{ mb: 0.5 }}>Last hex visited</MapSectionTitle>
      <Stack direction="row" spacing={0.75} sx={{ alignItems: 'flex-start' }}>
        <Box sx={{ pt: 0.25 }}><TerrainIcon size={ICON_SIZES.md} color={VTT_COLORS.accent} /></Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography sx={lastHexSx}>{hexLabel(last.hex, last.travelHours)}</Typography>
          {last.headline ? <Typography sx={lastHeadlineSx}>{last.headline}</Typography> : null}
          {(last.lines || []).map((line) => (
            <Typography key={line} sx={lastLineSx}>{line}</Typography>
          ))}
          {last.clock ? (
            <Typography sx={lastMetaSx}>
              {formatCampaignDateTime(last.clock)}
              {last.clock.weather ? ` · ${last.clock.weather}${last.clock.intensity ? ` ${last.clock.intensity}` : ''}` : ''}
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
            <Button size="small" sx={lastButtonSx} startIcon={<Dices size={ICON_SIZES.xs} />} onClick={onOpenResult}>
              See the rolls
            </Button>
          ) : null}
        </Box>
      </Stack>
    </Box>
  );
}

const clockSx = { color: VTT_COLORS.text, fontSize: FONT_SIZES.md };

const cardSx = {
  p: 1,
  border: '2px solid',
  borderRadius: 1.5,
};

const effectSx = { color: 'text.secondary', fontSize: FONT_SIZES.sm };

const nextHexSx = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 1,
  p: 1,
  border: '2px solid',
  borderColor: UI_COLORS.edge,
  borderRadius: 1.5,
  bgcolor: vttAlpha(VTT_COLORS.accent, OPACITY.wash),
};
const nextHexTitleSx = { fontSize: FONT_SIZES.xl, fontWeight: FONT_WEIGHTS.bold, lineHeight: LINE_HEIGHTS.tight, color: VTT_COLORS.accent };

const chipRowSx = { display: 'flex', flexWrap: 'wrap', gap: 0.5 };

const linkButtonSx = {
  px: 0.75,
  minWidth: 0,
  fontSize: FONT_SIZES.sm,
  textTransform: 'none',
};

const lastCardSx = {
  p: 1,
  border: '2px solid',
  borderColor: UI_COLORS.edge,
  borderRadius: 1.5,
  bgcolor: vttAlpha(VTT_COLORS.black, OPACITY.shade),
};

const lastHexSx = {
  ...TEXT_STYLES.title,
  fontSize: FONT_SIZES.sm,
  color: VTT_COLORS.text,
};

const lastHeadlineSx = { fontSize: FONT_SIZES.xl, fontWeight: FONT_WEIGHTS.bold, color: VTT_COLORS.accent, lineHeight: LINE_HEIGHTS.snug };
const lastLineSx = { fontSize: FONT_SIZES.md, color: 'text.primary', lineHeight: LINE_HEIGHTS.normal };
const lastMetaSx = { fontSize: FONT_SIZES.xs, color: 'text.secondary', lineHeight: LINE_HEIGHTS.normal };

const lastButtonSx = {
  mt: 0.5,
  px: 0.75,
  minWidth: 0,
  fontSize: FONT_SIZES.sm,
  textTransform: 'none',
};
