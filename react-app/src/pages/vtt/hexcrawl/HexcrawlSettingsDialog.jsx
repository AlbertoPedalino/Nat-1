import { useEffect, useState } from 'react';
import {
  Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Stack, TextField,
  Tooltip, Typography, alpha, useTheme,
} from '@mui/material';
import {
  CalendarDays, FastForward, Hexagon, Palette, Settings,
} from 'lucide-react';
import ColorField from '../../../shared/ui/ColorField.jsx';
import SelectorGroup from '../../gmboard/ui/SelectorGroup.jsx';
import MountSelector from '../../gmboard/hexcrawl/MountSelector.jsx';
import { SELECTOR_CONTRACTS } from '../../gmboard/ui/selectorContracts.js';
import { MONTH_NAMES, formatHM, validateStart } from '../../gmboard/session/time.js';
import {
  HEX_POPULATION_OPTIONS, TERRAIN_OPTIONS, TIER_OPTIONS,
} from '../../gmboard/state/constants.js';
import {
  POPULATION_ICONS, SEASON_ICONS, TERRAIN_ICONS, WEATHER_ICONS,
} from '../../gmboard/hexcrawl/hexIcons.js';
import { mergeBoardClock } from '../../../shared/hexcrawl/hexEntry.js';
import { VTT_COLORS } from '../../../shared/vtt/colors.js';
import { DEFAULT_GRID } from '../../../shared/vtt/scene/scene.js';
import { fullscreenContainer } from '../map/fullscreenContainer.js';
import {
  battleMapDialogActionsSx, battleMapDialogContentSx, battleMapDialogPaperSx, battleMapDialogTitleSx,
} from '../map/battleMapSurface.js';

const DEFAULT_HEX_COLOR = DEFAULT_GRID.hexColor;

// Everything the hexcrawl is set up with, in one place and at a size a GM can
// read: the calendar on one side, what an untouched hex is on the other. The
// corner panel only reports it — it is looked at between clicks, and this is
// opened when the table decides something has changed.
//
// Button rows rather than dropdowns, as on the GM Board: a dropdown's menu is
// portalled to the page body, which a fullscreen map does not paint.
export default function HexcrawlSettingsDialog({
  open, onClose,
  board, clock, clockLinked, defaults, busy, error,
  hexColor, onHexColorChange,
  onDefaultsChange, onSeasonChange, onClockChange, onClockAdvance,
}) {
  const theme = useTheme();
  const boardState = board?.state ? mergeBoardClock(board.state, clock) : null;
  const sky = boardState || clock;
  const locked = busy || !clockLinked || !board;
  const seasonContract = SELECTOR_CONTRACTS.season;
  const weatherContract = SELECTOR_CONTRACTS.weatherOverride;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      container={fullscreenContainer}
      slotProps={{ paper: { sx: battleMapDialogPaperSx } }}
    >
      <DialogTitle sx={[battleMapDialogTitleSx, titleSx]}>
        <Settings size={15} />
        Hexcrawl settings
      </DialogTitle>

      <DialogContent dividers sx={battleMapDialogContentSx}>
        {!board ? (
          <Typography sx={warnSx}>
            No hexcrawl board is linked to this campaign. Open the GM Board, save it, and pick this
            campaign under Links.
          </Typography>
        ) : null}
        {board && !clockLinked ? (
          <Typography sx={warnSx}>
            The campaign clock is not readable from here, so changes will not be saved.
          </Typography>
        ) : null}
        {error ? <Typography sx={warnSx}>{error}</Typography> : null}

        <Box sx={columnsSx}>
          <Stack spacing={2} sx={sectionCardSx}>
            <Typography sx={sectionTitleSx}><CalendarDays size={13} />Calendar</Typography>
            {sky ? (
              <DateTimeForm clock={sky} disabled={locked} onChange={onClockChange} />
            ) : null}
            {onClockAdvance ? <AdvanceForm disabled={locked} onAdvance={onClockAdvance} /> : null}
            <SelectorGroup
              label="Season"
              options={seasonContract.options}
              getId={seasonContract.getId}
              value={boardState?.season || null}
              // Picking the season it is already in clears it.
              onChange={(option) => onSeasonChange?.(option.id === boardState?.season ? null : option.id)}
              getIcon={(option) => SEASON_ICONS[option.id]}
              disabled={locked}
            />
            {sky && onClockChange ? (
              <SelectorGroup
                label="Weather"
                options={weatherContract.options}
                getId={weatherContract.getId}
                value={weatherContract.deriveValue({ meteo: sky.meteo || 'Clear', intensity: sky.intensity || '' })}
                onChange={(option) => onClockChange({ meteo: option.meteo, intensity: option.intensity })}
                getIcon={(option) => WEATHER_ICONS[option.meteo]}
                disabled={locked}
              />
            ) : null}
          </Stack>

          <Stack spacing={2} sx={sectionCardSx}>
            <Typography sx={sectionTitleSx}><Hexagon size={13} />A hex is, unless it says otherwise</Typography>
            <SelectorGroup
              label="Terrain"
              options={TERRAIN_OPTIONS}
              getId={(option) => option.label}
              value={defaults?.terrain || null}
              onChange={(option) => onDefaultsChange?.({
                terrain: option.label === defaults?.terrain ? null : option.label,
              })}
              getIcon={(option) => TERRAIN_ICONS[option.id]}
              disabled={locked}
            />
            <SelectorGroup
              label="Population"
              options={HEX_POPULATION_OPTIONS}
              value={defaults?.pop || null}
              onChange={(option) => onDefaultsChange?.({
                pop: option.id === defaults?.pop ? null : option.id,
              })}
              getIcon={(option) => POPULATION_ICONS[option.id]}
              disabled={locked}
            />
            {/* The tier keeps the GM Board's colours: it is how the board says
                how hard the hex is about to be. */}
            <TierRow
              value={defaults?.tier ?? null}
              busy={locked}
              tones={theme.palette.gmboard.tier}
              onChange={(tier) => onDefaultsChange?.({ tier })}
            />
            {/* The party's speed is shared with the GM Board across every map. */}
            <MountSelector
              label="Mount"
              disabled={locked}
              value={defaults?.mountSpeed ?? boardState?.mountSpeed ?? 1}
              onChange={(mountSpeed) => onDefaultsChange?.({ mountSpeed })}
            />
          </Stack>
        </Box>

        {/* The colour of the country the party has walked. It is the GM's to
            pick, and kept on the scene, where the players and the projector
            read it too. */}
        {onHexColorChange ? (
          <Box sx={[sectionCardSx, { mt: 2 }]}>
            <Typography sx={[sectionTitleSx, { mb: 1.25 }]}><Palette size={13} />Map</Typography>
            <Typography sx={groupLabelSx}>Explored hex colour</Typography>
            <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
              {/* Deferred, as the grid's own colour is: a controlled colour
                  input re-renders on every move inside the picker and snaps
                  the widget away from the pointer. */}
              <ColorField
                value={hexColor || DEFAULT_HEX_COLOR}
                onChange={onHexColorChange}
                deferMs={180}
                label="Explored hex colour"
                sx={swatchSx}
              />
              <Typography sx={hintSx}>{hexColor || DEFAULT_HEX_COLOR}</Typography>
              {(hexColor || DEFAULT_HEX_COLOR) !== DEFAULT_HEX_COLOR ? (
                <Button size="small" onClick={() => onHexColorChange(DEFAULT_HEX_COLOR)}>Reset</Button>
              ) : null}
            </Stack>
          </Box>
        ) : null}
      </DialogContent>

      <DialogActions sx={battleMapDialogActionsSx}>
        <Button onClick={onClose}>Done</Button>
      </DialogActions>
    </Dialog>
  );
}

// Date and time together, as the GM Board's "Set start": a table jumping ahead
// a week lands at a particular hour, not at whatever the clock last read.
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

  if (!onChange) return null;

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
        <TextField
          select
          size="small"
          label="Month"
          value={month}
          onChange={(event) => setMonth(event.target.value)}
          disabled={disabled}
          slotProps={{ select: { native: true } }}
        >
          {MONTH_NAMES.map((name, index) => (
            <option key={name} value={String(index + 1)}>{name}</option>
          ))}
        </TextField>
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

// Hours that pass off the map — a rest, a siege, a day in town.
function AdvanceForm({ disabled, onAdvance }) {
  const [hours, setHours] = useState('1');
  const valid = Number(hours) > 0;
  const advance = (amount) => { if (Number(amount) > 0) onAdvance(Number(amount)); };

  return (
    <Box>
      <Typography sx={groupLabelSx}>Let time pass · the weather keeps rolling</Typography>
      <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 0.75 }}>
        {[1, 4, 8, 24].map((amount) => (
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
        <Tooltip title="Advance by these hours">
          <span>
            <IconButton
              size="small"
              aria-label="Advance the clock"
              disabled={disabled || !valid}
              onClick={() => advance(hours)}
            >
              <FastForward size={16} />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>
    </Box>
  );
}

// Clicking the tier it is already on clears it, so a map can be laid out
// without claiming a difficulty it has not been given.
function TierRow({ value, tones, busy, onChange }) {
  return (
    <Box>
      <Typography sx={groupLabelSx}>Encounter tier</Typography>
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
              <Box component="span" sx={{ fontSize: '0.6rem', opacity: 0.85 }}>{option.shortLevels}</Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

const titleSx = { display: 'flex', alignItems: 'center', gap: 0.75 };

const columnsSx = {
  display: 'grid',
  gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
  gap: 2,
  pt: 0.5,
};

// Each group sits on the map's own inset card, as encounter and monster rows do.
const sectionCardSx = {
  p: 1.5,
  borderRadius: 1,
  border: '1px solid',
  borderColor: 'gmboard.vtt.goldBorder',
  bgcolor: 'gmboard.vtt.inset',
};

const sectionTitleSx = {
  display: 'flex',
  alignItems: 'center',
  gap: 0.6,
  fontFamily: '"Cinzel", Georgia, serif',
  fontSize: '0.72rem',
  fontWeight: 700,
  letterSpacing: '0.08em',
  color: 'gmboard.vtt.gold',
  pb: 0.6,
  borderBottom: '1px solid',
  borderColor: 'gmboard.vtt.goldTint',
};

// Matches SelectorGroup's own label, so every row in the dialog reads alike.
const groupLabelSx = {
  fontFamily: '"Cinzel", Georgia, serif',
  fontSize: '0.68rem',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'text.secondary',
  mb: 0.5,
};

const dateRowSx = {
  display: 'grid',
  gridTemplateColumns: { xs: '64px 1fr 80px', sm: '64px 1fr 80px 110px auto' },
  gap: 0.75,
  alignItems: 'center',
  '& > :nth-of-type(4)': { gridColumn: { xs: '1 / 3', sm: 'auto' } },
};

const hintSx = { color: VTT_COLORS.panelTextMuted, fontSize: '0.72rem' };
const warnSx = { color: 'warning.main', fontSize: '0.75rem', lineHeight: 1.4, mb: 1.5 };
const errorSx = { color: 'error.main', fontSize: '0.7rem', mt: 0.5 };
const quickButtonSx = { minWidth: 0, px: 1, fontSize: '0.72rem', textTransform: 'none' };

const swatchSx = {
  width: 40,
  height: 28,
  p: 0,
  border: '1px solid',
  borderColor: 'gmboard.vtt.goldBorderStrong',
  borderRadius: 1,
  bgcolor: 'transparent',
  cursor: 'pointer',
  flexShrink: 0,
};

const tierRowSx = { display: 'flex', flexWrap: 'wrap', gap: 0.75 };

const tierButtonSx = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 0.1,
  flex: '1 1 64px',
  py: 0.5,
  px: 0.75,
  fontFamily: 'inherit',
  fontSize: '0.72rem',
  lineHeight: 1.2,
  border: '1px solid',
  borderRadius: 1,
  cursor: 'pointer',
  '&:disabled': { cursor: 'default', opacity: 0.5 },
  '&:focus-visible': { outline: '2px solid currentColor', outlineOffset: '1px' },
};
