import { useState } from 'react';
import {
  Button,
  MenuItem,
  Popover,
  Slider,
  Stack,
  TextField,
} from '@mui/material';
import { ChevronDown, Cloud } from 'lucide-react';
import { VTT_COLORS, vttAlpha } from '../../../shared/vtt/colors.js';
import { atmosphereFor } from '../../../shared/vtt/scene/atmosphere.js';
import { IMAGE_FILTER_PRESETS, imageFilterFor } from '../../../shared/vtt/scene/imageFilters.js';
import { battleMapDialogPaperSx } from '../map/battleMapSurface.js';
import { numberSx } from './panelStyles.js';
import { SectionLabel } from './ScenePanelSection.jsx';
import { ATMOSPHERE_ICONS, AtmospherePicker, atmospherePresetsByType } from './AtmospherePicker.jsx';
import { OPACITY } from '../../../shared/ui/colors.js';
import { ICON_SIZES } from '../../../shared/ui/iconSizes.js';
import Caption from '../../../shared/ui/Caption.jsx';

// The scene panel's Light & weather section: the light filter and the
// atmosphere of the picture on show. Both belong to a picture, so without one
// the section only says so.

export function lookSummary(scene) {
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

export function LightWeatherControls({ scene, onImageFilterChange, onAtmosphereChange }) {
  const pictureOnShow = scene.shownImage === 'background' ? scene.backgroundPath : scene.imagePath;
  return (
    <>
      {pictureOnShow ? null : (
        <Caption>
          Upload a battlemap or a background first: light and weather belong to a picture.
        </Caption>
      )}
      <ImageLightSection scene={scene} onImageFilterChange={onImageFilterChange} />
      <ImageAtmosphereSection scene={scene} onAtmosphereChange={onAtmosphereChange} />
    </>
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
        startIcon={<SelectedAtmosphereIcon size={ICON_SIZES.md} strokeWidth={1.8} />}
        endIcon={<ChevronDown size={ICON_SIZES.sm} />}
        aria-label={`Choose atmosphere. Current: ${selectedAtmosphere.label}`}
        aria-haspopup="dialog"
        aria-expanded={Boolean(atmosphereAnchor)}
        onClick={(event) => setAtmosphereAnchor(event.currentTarget)}
        sx={{
          justifyContent: 'flex-start',
          color: atmosphere.type === 'none' ? VTT_COLORS.textSecondary : VTT_COLORS.accentHighlight,
          borderColor: vttAlpha(VTT_COLORS.textSecondary, OPACITY.line),
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
