import { useEffect, useState } from 'react';
import { Box, Button, IconButton, Stack, TextField, Tooltip, Typography } from '@mui/material';
import {
  CalendarDays, FastForward, Hexagon, Palette, Settings,
} from 'lucide-react';
import ColorField from '../../../shared/ui/ColorField.jsx';
import SelectorGroup from '../../../shared/gmboard/ui/SelectorGroup.jsx';
import MountSelector from '../../../shared/hexcrawl/ui/MountSelector.jsx';
import { SELECTOR_CONTRACTS } from '../../../shared/gmboard/ui/selectorContracts.js';
import { MONTH_NAMES, formatHM, validateStart } from '../../../shared/gmboard/campaignTime.js';
import { HEX_POPULATION_OPTIONS, TERRAIN_OPTIONS } from '../../../shared/gmboard/boardOptions.js';
import {
  POPULATION_ICONS, SEASON_ICONS, TERRAIN_ICONS, WEATHER_ICONS,
} from '../../../shared/hexcrawl/hexIcons.js';
import { mergeBoardClock } from '../../../shared/hexcrawl/hexEntry.js';
import { VTT_COLORS } from '../../../shared/vtt/colors.js';
import { DEFAULT_GRID } from '../../../shared/vtt/scene/scene.js';
import { UI_FONTS } from '../../../shared/ui/fonts.js';
import TierSelector from '../../../shared/gmboard/ui/TierSelector.jsx';
import { captionLabelSx } from '../../../shared/ui/PanelHeader.jsx';
import BattleMapDialog from '../map/BattleMapDialog.jsx';

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
  const boardState = board?.state ? mergeBoardClock(board.state, clock) : null;
  const sky = boardState || clock;
  const locked = busy || !clockLinked || !board;
  const seasonContract = SELECTOR_CONTRACTS.season;
  const weatherContract = SELECTOR_CONTRACTS.weatherOverride;

  return (
    <BattleMapDialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      titleSx={titleSx}
      title={(
        <>
          <Settings size={15} />
          Hexcrawl settings
        </>
      )}
      contentProps={{ dividers: true }}
      actions={<Button onClick={onClose}>Done</Button>}
    >
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
              value={weatherContract.deriveValue({ weather: sky.weather || 'Clear', intensity: sky.intensity || '' })}
              onChange={(option) => onClockChange({ weather: option.weather, intensity: option.intensity })}
              getIcon={(option) => WEATHER_ICONS[option.weather]}
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
          {/* Clearable, so a map can be laid out without claiming a
              difficulty it has not been given. */}
          <TierSelector
            label="Encounter tier"
            value={defaults?.tier ?? null}
            disabled={locked}
            clearable
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
            />
            <Typography sx={hintSx}>{hexColor || DEFAULT_HEX_COLOR}</Typography>
            {(hexColor || DEFAULT_HEX_COLOR) !== DEFAULT_HEX_COLOR ? (
              <Button size="small" onClick={() => onHexColorChange(DEFAULT_HEX_COLOR)}>Reset</Button>
            ) : null}
          </Stack>
        </Box>
      ) : null}
    </BattleMapDialog>
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
  fontFamily: UI_FONTS.display,
  fontSize: '0.72rem',
  fontWeight: 700,
  letterSpacing: '0.08em',
  color: 'gmboard.vtt.gold',
  pb: 0.6,
  borderBottom: '1px solid',
  borderColor: 'gmboard.vtt.goldTint',
};

const groupLabelSx = { ...captionLabelSx, mb: 0.5 };

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

