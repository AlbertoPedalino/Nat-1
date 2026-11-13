import { useState } from 'react';
import {
  Button,
  Popover,
  Stack,
  TextField,
} from '@mui/material';
import { ChevronDown, Cloud } from 'lucide-react';
import { VTT_COLORS, vttAlpha } from '../../../shared/vtt/colors.js';
import { atmosphereFor } from '../../../shared/vtt/scene/atmosphere.js';
import { IMAGE_FILTER_PRESETS, imageFilterFor } from '../../../shared/vtt/scene/imageFilters.js';
import { numberSx } from './panelStyles.js';
import MapSectionTitle from '../map/MapSectionTitle.jsx';
import { ATMOSPHERE_ICONS, AtmospherePicker, atmospherePresetsByType } from './AtmospherePicker.jsx';
import { OPACITY } from '../../../shared/ui/colors.js';
import { ICON_SIZES } from '../../../shared/ui/iconSizes.js';
import Caption from '../../../shared/ui/Caption.jsx';
import SelectField from '../../../shared/ui/SelectField.jsx';
import LabeledSlider from '../../../shared/ui/LabeledSlider.jsx';
import { MAP_PAPER_SX } from '../../../shared/ui/mapPaper.js';

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
      <MapSectionTitle hint="Shows a daylight picture at another time of day. It tints the picture only: tokens, drawings and the atmosphere stay as they are. Every picture keeps its own, so the same background uploaded twice can be shown by day and by night.">
        {showingBackground ? 'Light on this background' : 'Light on the battlemap'}
      </MapSectionTitle>
      <SelectField
        ariaLabel="Light filter"
        value={filter.type}
        onChange={(type) => setFilter({ type })}
        options={IMAGE_FILTER_PRESETS.map((preset) => ({ value: preset.value, label: preset.label }))}
        fullWidth={false}
      />
      {filter.type === 'none' ? null : (
        <LabeledSlider
          ariaLabel="Light filter strength"
          min={0.1}
          max={1}
          step={0.05}
          value={filter.intensity}
          onChange={(value) => setFilter({ intensity: value })}
        />
      )}
    </Stack>
  );
}

const WIND_SPEEDS = [
  { value: 0.5, label: 'Slow' },
  { value: 1, label: 'Normal' },
  { value: 1.5, label: 'Fast' },
  { value: 2, label: 'Violent' },
];

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
      <MapSectionTitle hint="A procedural weather layer over the picture on show. Every picture keeps its own, so the battlemap can be under a storm while a background stays dry. It is rendered locally as a continuous field, so denser rain or fog does not create more particles.">
        {showingBackground ? 'Atmosphere on this background' : 'Atmosphere on the battlemap'}
      </MapSectionTitle>
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
              ...MAP_PAPER_SX,
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
        <LabeledSlider
          ariaLabel="Atmosphere intensity"
          min={0.1}
          max={1}
          step={0.05}
          value={atmosphere.intensity}
          onChange={(value) => setAtmosphere({ intensity: value })}
        />
      )}
      {atmosphere.type === 'none' ? null : (
        <Stack spacing={0.5}>
          <MapSectionTitle hint="Direction is measured clockwise; movement changes how quickly the atmospheric field crosses the view.">Wind</MapSectionTitle>
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
            <SelectField
              label="Movement"
              value={atmosphere.speed}
              onChange={(speed) => setAtmosphere({ speed: Number(speed) })}
              options={WIND_SPEEDS}
              fullWidth={false}
              sx={{ flex: 1 }}
            />
          </Stack>
        </Stack>
      )}
    </Stack>
  );
}
