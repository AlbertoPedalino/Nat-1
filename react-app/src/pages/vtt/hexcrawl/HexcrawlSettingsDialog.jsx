import { Box, Button, Stack } from '@mui/material';
import { CalendarDays, Hexagon, Palette, Settings } from 'lucide-react';
import ColorField from '../../../shared/ui/ColorField.jsx';
import SelectorGroup from '../../../shared/gmboard/ui/SelectorGroup.jsx';
import MountSelector from '../../../shared/hexcrawl/ui/MountSelector.jsx';
import { HEX_POPULATION_OPTIONS, TERRAIN_OPTIONS } from '../../../shared/gmboard/boardOptions.js';
import { POPULATION_ICONS, TERRAIN_ICONS } from '../../../shared/hexcrawl/hexIcons.js';
import { mergeBoardClock } from '../../../shared/hexcrawl/hexEntry.js';
import { DEFAULT_GRID } from '../../../shared/vtt/scene/scene.js';
import TierSelector from '../../../shared/gmboard/ui/TierSelector.jsx';
import SheetDialog from '../../../shared/ui/SheetDialog.jsx';
import SectionTitle from '../../../shared/ui/SectionTitle.jsx';
import CampaignCalendarFields from '../../../shared/gmboard/ui/CampaignCalendarFields.jsx';
import { ICON_SIZES } from '../../../shared/ui/iconSizes.js';
import HexcrawlLinkWarnings from './HexcrawlLinkWarnings.jsx';
import Caption from '../../../shared/ui/Caption.jsx';

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

  return (
    <SheetDialog
      surface="map"
      open={open}
      onClose={onClose}
      maxWidth="md"
      icon={<Settings size={ICON_SIZES.md} />}
      title="Hexcrawl settings"
      actions={<Button onClick={onClose}>Done</Button>}
    >
      <HexcrawlLinkWarnings board={board} clockLinked={clockLinked} error={error} />

      <Box sx={columnsSx}>
        <Stack spacing={2} sx={sectionCardSx}>
          <SectionTitle icon={CalendarDays}>Calendar</SectionTitle>
          {sky ? (
            <CampaignCalendarFields
              clock={sky}
              season={boardState?.season}
              disabled={locked}
              onDateTime={onClockChange}
              onAdvance={onClockAdvance}
              onSeason={onSeasonChange}
              onWeather={onClockChange}
            />
          ) : null}
        </Stack>

        <Stack spacing={2} sx={sectionCardSx}>
          <SectionTitle icon={Hexagon}>A hex is, unless it says otherwise</SectionTitle>
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
          <SectionTitle icon={Palette} sx={{ mb: 1.25 }}>Map</SectionTitle>
          <SectionTitle sx={{ mb: 0.5 }}>Explored hex colour</SectionTitle>
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
            <Caption>{hexColor || DEFAULT_HEX_COLOR}</Caption>
            {(hexColor || DEFAULT_HEX_COLOR) !== DEFAULT_HEX_COLOR ? (
              <Button size="small" onClick={() => onHexColorChange(DEFAULT_HEX_COLOR)}>Reset</Button>
            ) : null}
          </Stack>
        </Box>
      ) : null}
    </SheetDialog>
  );
}

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
  border: '2px solid',
  borderColor: 'gmboard.vtt.accentBorder',
  bgcolor: 'gmboard.vtt.inset',
};


