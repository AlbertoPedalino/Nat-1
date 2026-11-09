import { Box, Button, Stack, Typography } from '@mui/material';
import { CalendarDays, Hexagon, Palette, Settings } from 'lucide-react';
import ColorField from '../../../shared/ui/ColorField.jsx';
import SelectorGroup from '../../../shared/gmboard/ui/SelectorGroup.jsx';
import MountSelector from '../../../shared/hexcrawl/ui/MountSelector.jsx';
import { HEX_POPULATION_OPTIONS, TERRAIN_OPTIONS } from '../../../shared/gmboard/boardOptions.js';
import { POPULATION_ICONS, TERRAIN_ICONS } from '../../../shared/hexcrawl/hexIcons.js';
import { mergeBoardClock } from '../../../shared/hexcrawl/hexEntry.js';
import { VTT_COLORS } from '../../../shared/vtt/colors.js';
import { DEFAULT_GRID } from '../../../shared/vtt/scene/scene.js';
import { UI_FONTS, FONT_SIZES } from '../../../shared/ui/fonts.js';
import TierSelector from '../../../shared/gmboard/ui/TierSelector.jsx';
import BattleMapDialog from '../map/BattleMapDialog.jsx';
import CampaignCalendarFields from '../../../shared/gmboard/ui/CampaignCalendarFields.jsx';
import { captionLabelSx } from '../../../shared/ui/PanelHeader.jsx';

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
  fontSize: FONT_SIZES.md,
  fontWeight: 700,
  letterSpacing: '0.08em',
  color: 'gmboard.vtt.gold',
  pb: 0.6,
  borderBottom: '1px solid',
  borderColor: 'gmboard.vtt.goldTint',
};



const groupLabelSx = { ...captionLabelSx, mb: 0.5 };
const hintSx = { color: VTT_COLORS.panelTextMuted, fontSize: FONT_SIZES.md };
const warnSx = { color: 'warning.main', fontSize: FONT_SIZES.lg, lineHeight: 1.4, mb: 1.5 };

