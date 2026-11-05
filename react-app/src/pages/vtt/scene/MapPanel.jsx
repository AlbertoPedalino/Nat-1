import { useRef, useState } from 'react';
import { VTT_COLORS, vttAlpha } from '../../../shared/vtt/colors.js';
import {
  Box,
  Button,
  ButtonBase,
  FormControlLabel,
  IconButton,
  MenuItem,
  Popover,
  Slider,
  Stack,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Ban,
  Cloud,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  ChevronDown,
  Coins,
  Flame,
  Frame,
  Grid3x3,
  Hexagon,
  House,
  Image as ImageIcon,
  ImagePlus,
  Snowflake,
  Square,
  SunMedium,
  ThermometerSun,
  Trees,
  Trash2,
  Wind,
} from 'lucide-react';
import ColorField from '../../../shared/ui/ColorField.jsx';
import InfoHint from '../../../shared/ui/InfoHint.jsx';
import CollapsibleBody from '../../../shared/ui/CollapsibleBody.jsx';
import { DEFAULT_GRID } from '../../../shared/vtt/scene/scene.js';
import { ATMOSPHERE_PRESETS, atmosphereFor } from '../../../shared/vtt/scene/atmosphere.js';
import { IMAGE_FILTER_PRESETS, imageFilterFor } from '../../../shared/vtt/scene/imageFilters.js';
import { battleMapDialogPaperSx } from '../map/battleMapSurface.js';
import { numberSx, pillLabelSx, colorInputSx } from './panelStyles.js';

// The GM's scene panel (MapCorner): four collapsible sections — Pictures,
// Light & weather (per-picture light filter and atmosphere), Grid, Play area —
// plus the picture switch also shown compact in the scene bar.

// The explanations used to sit under the controls as captions. Over a map they
// are the wrong trade: the panel lives inside the board, so every line of prose
// is a line of map, and the text is read once and then in the way forever.
// Behind an icon it is still one hover away for whoever has not met the control
// yet.
//
// Focusable on purpose: a tooltip only reachable by hover is not reachable at
// all on a touch screen or from the keyboard.
function SectionLabel({ label, hint }) {
  return (
    <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      {hint ? <InfoHint label={`About the ${label.toLowerCase()}`} text={hint} /> : null}
    </Stack>
  );
}

const ATMOSPHERE_ICONS = Object.freeze({
  none: Ban,
  rain: CloudRain,
  storm: CloudLightning,
  wind: Wind,
  fog: CloudFog,
  snow: Snowflake,
  blizzard: CloudSnow,
  sandstorm: Cloud,
  fire: Flame,
  heatwave: ThermometerSun,
  sunrays: SunMedium,
  swamp: Trees,
  haunted: House,
  goldvault: Coins,
});

const atmospherePresetsByType = new Map(
  ATMOSPHERE_PRESETS.map((preset) => [preset.value, preset]),
);

function AtmosphereOption({ type, selected, onSelect }) {
  const preset = atmospherePresetsByType.get(type);
  const Icon = ATMOSPHERE_ICONS[type] || Cloud;
  return (
    <ToggleButton
      value={type}
      selected={selected}
      onClick={() => onSelect(type)}
      aria-label={preset.label}
      sx={{
        minWidth: 0,
        justifyContent: 'flex-start',
        gap: 0.75,
        px: 1,
        py: 0.7,
        border: `1px solid ${vttAlpha(VTT_COLORS.gold, 0.35)}`,
        borderRadius: '7px !important',
        bgcolor: vttAlpha(VTT_COLORS.ink, 0.85),
        color: VTT_COLORS.railText,
        textTransform: 'none',
        '&:hover': {
          borderColor: vttAlpha(VTT_COLORS.gold, 0.68),
          bgcolor: vttAlpha(VTT_COLORS.gold, 0.12),
          color: VTT_COLORS.panelText,
        },
        '&.Mui-selected': {
          borderColor: VTT_COLORS.gold,
          bgcolor: VTT_COLORS.gold,
          color: VTT_COLORS.ink,
        },
        '&.Mui-selected:hover': {
          borderColor: VTT_COLORS.goldBright,
          bgcolor: VTT_COLORS.goldBright,
          color: VTT_COLORS.ink,
        },
      }}
    >
      <Icon size={15} strokeWidth={1.8} />
      <Typography
        component="span"
        variant="caption"
        noWrap
        sx={{ minWidth: 0, fontWeight: selected ? 700 : 500 }}
      >
        {preset.label}
      </Typography>
    </ToggleButton>
  );
}

function AtmospherePicker({ value, onSelect }) {
  const [query, setQuery] = useState('');
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const visiblePresets = ATMOSPHERE_PRESETS.filter((preset) => (
    !normalizedQuery
    || preset.label.toLocaleLowerCase().includes(normalizedQuery)
    || preset.value.toLocaleLowerCase().includes(normalizedQuery)
  ));

  return (
    <Stack spacing={0.85} role="group" aria-label="Atmosphere">
      <TextField
        size="small"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search atmospheres…"
        slotProps={{ htmlInput: { 'aria-label': 'Search atmospheres' } }}
        autoFocus
      />
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 0.55 }}>
        {visiblePresets.map((preset) => (
          <AtmosphereOption
            key={preset.value}
            type={preset.value}
            selected={value === preset.value}
            onSelect={onSelect}
          />
        ))}
      </Box>
      {visiblePresets.length === 0 ? (
        <Typography variant="caption" color="text.secondary" sx={{ py: 1, textAlign: 'center' }}>
          No atmospheres found
        </Typography>
      ) : null}
    </Stack>
  );
}

// The light of the picture on show: a daylight painting at dusk or at night.
// Each picture keeps its own, so it follows the battlemap/background switch.
function ImageLightSection({ scene, onImageFilterChange }) {
  const showingBackground = scene.shownImage === 'background';
  const path = showingBackground ? scene.backgroundPath : scene.imagePath;
  if (!path || !onImageFilterChange) return null;
  const filter = imageFilterFor(scene.imageFilters, path);
  const setFilter = (patch) => onImageFilterChange(path, { ...filter, ...patch });

  return (
    <Stack spacing={0.5}>
      <SectionLabel
        label={showingBackground ? 'Light on this background' : 'Light on the battlemap'}
        hint="Shows a daylight picture at another time of day. It tints the picture only: tokens, drawings and the atmosphere stay as they are. Every picture keeps its own, so the same background uploaded twice can be shown by day and by night."
      />
      <TextField
        select
        size="small"
        value={filter.type}
        onChange={(event) => setFilter({ type: event.target.value })}
        slotProps={{ select: { inputProps: { 'aria-label': 'Light filter' } } }}
      >
        {IMAGE_FILTER_PRESETS.map((preset) => (
          <MenuItem key={preset.value} value={preset.value}>{preset.label}</MenuItem>
        ))}
      </TextField>
      {filter.type === 'none' ? null : (
        <Slider
          size="small"
          min={0.1}
          max={1}
          step={0.05}
          value={filter.intensity}
          valueLabelDisplay="auto"
          aria-label="Light filter strength"
          onChange={(_, value) => setFilter({ intensity: value })}
          sx={{ mx: 0.5, width: 'calc(100% - 8px)' }}
        />
      )}
    </Stack>
  );
}

// Which of the scene panel's sections are open. A per-browser convenience: a
// GM who calibrates once and then lives in the weather should not reopen it
// every time. Read through try/catch, so a blocked storage only forgets.
const SECTIONS_KEY = 'gb:vtt-scene-sections';

const DEFAULT_SECTIONS = Object.freeze(['pictures']);

function readOpenSections() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(SECTIONS_KEY));
    return Array.isArray(parsed) ? parsed : DEFAULT_SECTIONS;
  } catch {
    return DEFAULT_SECTIONS;
  }
}

function useOpenSections() {
  const [open, setOpen] = useState(readOpenSections);
  const toggle = (id) => {
    const next = open.includes(id) ? open.filter((entry) => entry !== id) : [...open, id];
    setOpen(next);
    try { window.localStorage.setItem(SECTIONS_KEY, JSON.stringify(next)); } catch {}
  };
  return [open, toggle];
}

// One question about the scene behind one header. Closed, the header still
// answers it in a line ("Squares · 70 px · shown"), so the panel reads as an
// overview first and a form second.
function PanelSection({ id, icon: Icon, title, summary, open, onToggle, children }) {
  const bodyId = `scene-panel-${id}`;
  return (
    <Box sx={sectionSx}>
      <ButtonBase
        onClick={() => onToggle(id)}
        aria-expanded={open}
        aria-controls={bodyId}
        sx={sectionHeaderSx}
      >
        <Box component="span" sx={sectionIconSx}><Icon size={15} strokeWidth={1.8} /></Box>
        <Box component="span" sx={{ minWidth: 0, flex: 1, textAlign: 'left' }}>
          <Typography component="span" sx={sectionTitleSx}>{title}</Typography>
          {open ? null : (
            <Typography component="span" variant="caption" noWrap sx={sectionSummarySx}>
              {summary}
            </Typography>
          )}
        </Box>
        <Box
          component="span"
          sx={{ display: 'flex', color: VTT_COLORS.railText, transition: 'transform 150ms', transform: open ? 'rotate(180deg)' : 'none' }}
        >
          <ChevronDown size={15} />
        </Box>
      </ButtonBase>
      <CollapsibleBody open={open} id={bodyId}>
        <Stack spacing={1} sx={{ px: 1, pt: 0.25, pb: 1.1 }}>{children}</Stack>
      </CollapsibleBody>
    </Box>
  );
}

// The weather of the picture on show, kept per picture like its light: the
// battlemap under a storm, the tavern background dry.
function ImageAtmosphereSection({ scene, onAtmosphereChange }) {
  const [atmosphereAnchor, setAtmosphereAnchor] = useState(null);
  const showingBackground = scene.shownImage === 'background';
  const path = showingBackground ? scene.backgroundPath : scene.imagePath;
  if (!path || !onAtmosphereChange) return null;
  const atmosphere = atmosphereFor(scene.atmospheres, path);
  const setAtmosphere = (patch) => onAtmosphereChange(path, { ...atmosphere, ...patch });
  const selectAtmosphere = (type) => setAtmosphere({
    type,
    seed: type === atmosphere.type ? atmosphere.seed : (Date.now() % 999999) + 1,
  });
  const selectedAtmosphere = atmospherePresetsByType.get(atmosphere.type);
  const SelectedAtmosphereIcon = ATMOSPHERE_ICONS[atmosphere.type] || Cloud;

  return (
    <Stack spacing={0.75}>
      <SectionLabel
        label={showingBackground ? 'Atmosphere on this background' : 'Atmosphere on the battlemap'}
        hint="A procedural weather layer over the picture on show. Every picture keeps its own, so the battlemap can be under a storm while a background stays dry. It is rendered locally as a continuous field, so denser rain or fog does not create more particles."
      />
      <Button
        fullWidth
        size="small"
        variant="outlined"
        startIcon={<SelectedAtmosphereIcon size={16} strokeWidth={1.8} />}
        endIcon={<ChevronDown size={15} />}
        aria-label={`Choose atmosphere. Current: ${selectedAtmosphere.label}`}
        aria-haspopup="dialog"
        aria-expanded={Boolean(atmosphereAnchor)}
        onClick={(event) => setAtmosphereAnchor(event.currentTarget)}
        sx={{
          justifyContent: 'flex-start',
          color: atmosphere.type === 'none' ? VTT_COLORS.panelTextMuted : VTT_COLORS.goldBright,
          borderColor: vttAlpha(VTT_COLORS.railText, 0.28),
          textTransform: 'none',
          '& .MuiButton-endIcon': { ml: 'auto' },
        }}
      >
        {selectedAtmosphere.label}
      </Button>
      <Popover
        open={Boolean(atmosphereAnchor)}
        anchorEl={atmosphereAnchor}
        onClose={() => setAtmosphereAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        container={() => (
          atmosphereAnchor?.ownerDocument?.fullscreenElement
          || atmosphereAnchor?.ownerDocument?.body
        )}
        slotProps={{
          paper: {
            sx: {
              ...battleMapDialogPaperSx,
              width: 320,
              maxWidth: 'calc(100vw - 24px)',
              mt: 0.5,
              p: 1.25,
            },
          },
        }}
      >
        <AtmospherePicker value={atmosphere.type} onSelect={selectAtmosphere} />
      </Popover>
      {/* Under the picker, like the light filter's strength: it is the knob
          turned mid-scene, so it should not sit behind a second click. */}
      {atmosphere.type === 'none' ? null : (
        <Slider
          size="small"
          min={0.1}
          max={1}
          step={0.05}
          value={atmosphere.intensity}
          valueLabelDisplay="auto"
          aria-label="Atmosphere intensity"
          onChange={(_, value) => setAtmosphere({ intensity: value })}
          sx={{ mx: 0.5, width: 'calc(100% - 8px)' }}
        />
      )}
      {atmosphere.type === 'none' ? null : (
        <Stack spacing={0.5}>
          <SectionLabel label="Wind" hint="Direction is measured clockwise; movement changes how quickly the atmospheric field crosses the view." />
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <TextField
              size="small"
              label="Direction"
              type="number"
              value={atmosphere.direction}
              onChange={(event) => setAtmosphere({ direction: Number(event.target.value) })}
              slotProps={{ htmlInput: { min: 0, max: 359, step: 1 } }}
              sx={numberSx}
            />
            <TextField
              select
              size="small"
              label="Movement"
              value={atmosphere.speed}
              onChange={(event) => setAtmosphere({ speed: Number(event.target.value) })}
              sx={{ flex: 1 }}
            >
              <MenuItem value={0.5}>Slow</MenuItem>
              <MenuItem value={1}>Normal</MenuItem>
              <MenuItem value={1.5}>Fast</MenuItem>
              <MenuItem value={2}>Violent</MenuItem>
            </TextField>
          </Stack>
        </Stack>
      )}
    </Stack>
  );
}

function pictureSummary(scene) {
  const backgrounds = Array.isArray(scene.backgrounds)
    ? scene.backgrounds.length
    : (scene.backgroundPath ? 1 : 0);
  if (!scene.imagePath && !backgrounds) return 'Nothing uploaded yet';
  const parts = [scene.imagePath ? 'Battlemap' : 'No battlemap'];
  parts.push(backgrounds ? `${backgrounds} background${backgrounds === 1 ? '' : 's'}` : 'no background');
  parts.push(scene.shownImage === 'background' ? 'background on show' : 'battlemap on show');
  return parts.join(' · ');
}

function lookSummary(scene) {
  const path = scene.shownImage === 'background' ? scene.backgroundPath : scene.imagePath;
  if (!path) return 'No picture on show';
  const filter = imageFilterFor(scene.imageFilters, path);
  const atmosphere = atmosphereFor(scene.atmospheres, path);
  const light = filter.type !== 'none'
    ? IMAGE_FILTER_PRESETS.find((preset) => preset.value === filter.type)?.label
    : null;
  const weather = atmosphere.type === 'none' ? null : atmospherePresetsByType.get(atmosphere.type)?.label;
  return [light || 'Original light', weather || 'no atmosphere'].join(' · ');
}

function gridSummary(grid) {
  return [
    grid.shape === 'hex' ? 'Hexes' : 'Squares',
    `${grid.size} px`,
    grid.visible ? 'shown' : 'hidden',
  ].join(' · ');
}

export function MapPanel({
  scene, busy, onUploadMap, onUploadBackground, onRemoveMap, onRemoveBackground,
  onShownImageChange, onAddImage,
  onGridChange, onAtmosphereChange, onImageFilterChange, onPlayAreaChange, onFitPlayArea,
  // The switch has its own place on the map when this panel sits under it.
  hideSwitch = false,
}) {
  const mapRef = useRef(null);
  const backgroundRef = useRef(null);
  const extraRef = useRef(null);
  const [openSections, toggleSection] = useOpenSections();
  const setGrid = (patch) => onGridChange({ ...scene.grid, ...patch });
  const pictureOnShow = scene.shownImage === 'background' ? scene.backgroundPath : scene.imagePath;
  const cellPlural = scene.grid.shape === 'hex' ? 'hexes' : 'squares';
  const sectionProps = (id) => ({ id, open: openSections.includes(id), onToggle: toggleSection });

  return (
    <Stack spacing={0.75}>
      <PanelSection
        {...sectionProps('pictures')}
        icon={ImageIcon}
        title="Pictures"
        summary={pictureSummary(scene)}
      >
        {hideSwitch ? null : <ShownImageSwitch scene={scene} onShownImageChange={onShownImageChange} />}

        <SectionLabel label="Battlemap" />
        <Stack direction="row" spacing={0.5}>
          <Button size="small" variant="outlined" fullWidth disabled={busy} onClick={() => mapRef.current?.click()}>
            {scene.imagePath ? 'Replace map' : 'Upload map'}
          </Button>
          {scene.imagePath ? (
            <Tooltip title="Remove battlemap">
              <IconButton size="small" color="error" disabled={busy} aria-label="Remove battlemap" onClick={onRemoveMap}>
                <Trash2 size={15} />
              </IconButton>
            </Tooltip>
          ) : null}
        </Stack>

        <SectionLabel
          label="Backgrounds"
          hint="Establishing shots without a grid. A scene can hold several; switch between them from the strip at the bottom of the map while the background is on show."
        />
        <Stack direction="row" spacing={0.5}>
          <Button
            size="small"
            variant="outlined"
            fullWidth
            disabled={busy}
            onClick={() => backgroundRef.current?.click()}
          >
            {scene.backgroundPath ? 'Add another background' : 'Upload background'}
          </Button>
          {scene.backgroundPath ? (
            <Tooltip title="Remove the background on show">
              <IconButton size="small" color="error" disabled={busy} aria-label="Remove background" onClick={() => onRemoveBackground()}>
                <Trash2 size={15} />
              </IconButton>
            </Tooltip>
          ) : null}
        </Stack>

        {/* Anything else that belongs on the map — a rug, a door, a handout — is a
            piece on the map layer, so it can be moved, resized and removed like
            everything else instead of being a third special slot. */}
        <SectionLabel
          label="Images on the map"
          hint="It lands on the layer you are editing. Click it to get its corner handles: the corner moves each side on its own — drag it diagonally to scale, sideways or downwards to stretch — and the top handle turns it."
        />
        <Button
          size="small"
          variant="outlined"
          fullWidth
          startIcon={<ImagePlus size={15} />}
          disabled={busy}
          onClick={() => extraRef.current?.click()}
        >
          Add an image to the map
        </Button>

        <HiddenFileInput inputRef={mapRef} onPick={onUploadMap} />
        <HiddenFileInput inputRef={backgroundRef} onPick={onUploadBackground} />
        <HiddenFileInput inputRef={extraRef} onPick={onAddImage} />
      </PanelSection>

      <PanelSection
        {...sectionProps('mood')}
        icon={SunMedium}
        title="Light & weather"
        summary={lookSummary(scene)}
      >
        {pictureOnShow ? null : (
          <Typography variant="caption" color="text.secondary">
            Upload a battlemap or a background first: light and weather belong to a picture.
          </Typography>
        )}
        <ImageLightSection scene={scene} onImageFilterChange={onImageFilterChange} />
        <ImageAtmosphereSection scene={scene} onAtmosphereChange={onAtmosphereChange} />

      </PanelSection>

      <PanelSection
        {...sectionProps('grid')}
        icon={Grid3x3}
        title="Grid"
        summary={gridSummary(scene.grid)}
      >
        {/* Squares for a dungeon, hexes for the wilderness. Changing it changes
            what a piece's stored position means, so it is asked once, here with
            the calibration, rather than offered as a view option. */}
        <ToggleButtonGroup
          size="small"
          exclusive
          fullWidth
          value={scene.grid.shape === 'hex' ? 'hex' : 'square'}
          onChange={(_, value) => value && setGrid({ shape: value })}
          aria-label="Grid shape"
        >
          <ToggleButton value="square" aria-label="Square grid">
            <Grid3x3 size={14} />
            <Box component="span" sx={pillLabelSx}>Squares</Box>
          </ToggleButton>
          <ToggleButton value="hex" aria-label="Hex grid">
            <Hexagon size={14} />
            <Box component="span" sx={pillLabelSx}>Hexes</Box>
          </ToggleButton>
        </ToggleButtonGroup>

        <SectionLabel
          label="Alignment"
          hint="The cell size almost never matches the image, so all three numbers are editable: set Cell to the width of one square on the picture, then nudge the offsets until the lines sit on it."
        />
        <Stack direction="row" spacing={0.75}>
          <TextField
            label="Cell"
            size="small"
            type="number"
            value={scene.grid.size}
            onChange={(event) => setGrid({ size: Number(event.target.value) })}
            sx={numberSx}
          />
          <TextField
            label="Offset X"
            size="small"
            type="number"
            value={scene.grid.offsetX}
            onChange={(event) => setGrid({ offsetX: Number(event.target.value) })}
            sx={numberSx}
          />
          <TextField
            label="Offset Y"
            size="small"
            type="number"
            value={scene.grid.offsetY}
            onChange={(event) => setGrid({ offsetY: Number(event.target.value) })}
            sx={numberSx}
          />
        </Stack>

        {/* How the lines look: a printed battlemap already has squares of its
            own, and gold over a snowfield is not the same read as gold over a
            cave. */}
        <SectionLabel
          label="Lines"
          hint="Half a pixel to six, in screen pixels, so a line stays as fine at one zoom as at another. Whatever colour you pick is drawn faint enough to read the map through."
        />
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <ColorField
            value={scene.grid.color || DEFAULT_GRID.color}
            onChange={(color) => setGrid({ color })}
            deferMs={180}
            label="Grid colour"
            sx={colorInputSx}
          />
          <TextField
            label="Line"
            size="small"
            type="number"
            value={scene.grid.lineWidth ?? DEFAULT_GRID.lineWidth}
            onChange={(event) => setGrid({ lineWidth: Number(event.target.value) })}
            slotProps={{ htmlInput: { min: 0.5, max: 6, step: 0.5 } }}
            sx={numberSx}
          />
          <FormControlLabel
            control={(
              <Switch
                size="small"
                checked={scene.grid.visible}
                onChange={(event) => setGrid({ visible: event.target.checked })}
              />
            )}
            label={<Typography variant="body2">Show</Typography>}
            sx={{ ml: 0, mr: 0 }}
          />
        </Stack>

        {/* Creatures always take a square — that is what a battlemap is for. This
            is about the scenery: a door across a wall, a rug at an angle, a
            handout dropped between two squares. */}
        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
          <FormControlLabel
            control={(
              <Switch
                size="small"
                checked={scene.grid.snapObjects !== false}
                onChange={(event) => setGrid({ snapObjects: event.target.checked })}
              />
            )}
            label={<Typography variant="body2">Objects snap to the grid</Typography>}
          />
          <InfoHint
            label="About snapping"
            text="Off, objects and pictures are placed and dragged freely. Creature pieces keep their square either way."
          />
        </Stack>
      </PanelSection>

      <PanelSection
        {...sectionProps('playArea')}
        icon={Frame}
        title="Play area"
        summary={scene.playArea ? `${scene.playArea.w} × ${scene.playArea.h} ${cellPlural}` : 'Whole scene'}
      >
        <Typography variant="caption" color="text.secondary">
          Outside it is staging: the players never receive what stands there.
        </Typography>
        {scene.playArea ? (
          <>
            <Stack direction="row" spacing={0.75}>
              {['x', 'y', 'w', 'h'].map((key) => (
                <TextField
                  key={key}
                  label={key.toUpperCase()}
                  size="small"
                  type="number"
                  value={scene.playArea[key]}
                  onChange={(event) => onPlayAreaChange({ ...scene.playArea, [key]: Number(event.target.value) })}
                  sx={numberSx}
                />
              ))}
            </Stack>
            <Stack direction="row" spacing={0.5}>
              <Button
                size="small"
                variant="outlined"
                fullWidth
                disabled={busy || scene.shownImage !== 'map'}
                onClick={onFitPlayArea}
              >
                Refit to the map
              </Button>
              <Button size="small" fullWidth disabled={busy} onClick={() => onPlayAreaChange(null)}>
                Use the whole scene
              </Button>
            </Stack>
          </>
        ) : (
          // Sized from the picture on screen, so it has to be the battlemap:
          // fitted while the background is up it would take that one's shape.
          <Tooltip
            title={scene.shownImage !== 'map'
              ? 'Switch to the battlemap first — the play area is measured from the picture on screen.'
              : ''}
          >
            <span>
              <Button
                size="small"
                variant="outlined"
                fullWidth
                disabled={busy || scene.shownImage !== 'map'}
                onClick={onFitPlayArea}
              >
                Limit to the map
              </Button>
            </span>
          </Tooltip>
        )}
      </PanelSection>
    </Stack>
  );
}

const sectionSx = {
  borderRadius: 1,
  border: `1px solid ${vttAlpha(VTT_COLORS.gold, 0.16)}`,
  bgcolor: vttAlpha(VTT_COLORS.gold, 0.03),
  overflow: 'hidden',
};

const sectionHeaderSx = {
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  gap: 0.85,
  px: 1,
  py: 0.75,
  color: VTT_COLORS.panelText,
  '&:hover': { bgcolor: vttAlpha(VTT_COLORS.gold, 0.08) },
  '&.Mui-focusVisible': { outline: `1px solid ${VTT_COLORS.gold}`, outlineOffset: -1 },
};

const sectionIconSx = { display: 'flex', color: VTT_COLORS.gold, flexShrink: 0 };

const sectionTitleSx = {
  display: 'block',
  fontFamily: '"Cinzel", Georgia, serif',
  fontSize: '0.68rem',
  letterSpacing: '0.06em',
  lineHeight: 1.4,
};

const sectionSummarySx = {
  display: 'block',
  color: VTT_COLORS.panelTextFaint,
  lineHeight: 1.3,
};

// Two slots rather than one picture you keep replacing: the battlemap is the
// thing with a grid on it, the background is the establishing shot, and a
// session flips between them repeatedly. Small enough to live on the map itself,
// which is where the switching actually happens.
export function ShownImageSwitch({ scene, compact = false, onShownImageChange }) {
  return (
    <ToggleButtonGroup
      size="small"
      exclusive
      fullWidth={!compact}
      value={scene.shownImage}
      onChange={(_, value) => value && onShownImageChange(value)}
      aria-label="Shown image"
      sx={compact ? compactSwitchSx : null}
    >
      <ToggleButton value="map" aria-label="Show the battlemap">
        <Grid3x3 size={14} />
        <Box component="span" sx={pillLabelSx}>Battlemap</Box>
      </ToggleButton>
      <ToggleButton value="background" aria-label="Show the background">
        <ImageIcon size={14} />
        <Box component="span" sx={pillLabelSx}>Background</Box>
      </ToggleButton>
    </ToggleButtonGroup>
  );
}

const compactSwitchSx = {
  bgcolor: vttAlpha(VTT_COLORS.ink, 0.85),
  border: `1px solid ${vttAlpha(VTT_COLORS.gold, 0.35)}`,
  '& .MuiToggleButton-root': { color: VTT_COLORS.railText, border: 0, px: 1, py: 0.4 },
  '& .Mui-selected': { color: VTT_COLORS.ink, bgcolor: VTT_COLORS.gold },
};

function HiddenFileInput({ inputRef, onPick }) {
  return (
    <Box
      component="input"
      ref={inputRef}
      type="file"
      accept="image/*"
      sx={{ display: 'none' }}
      onChange={(event) => {
        const file = event.target.files?.[0];
        // Cleared before the handler runs, so picking the same file twice in a
        // row still fires a change event.
        event.target.value = '';
        if (file) onPick(file);
      }}
    />
  );
}
