import { useRef } from 'react';
import {
  Box,
  Button,
  IconButton,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
} from '@mui/material';
import { Grid3x3, Image as ImageIcon, ImagePlus, Trash2 } from 'lucide-react';
import { VTT_COLORS, vttAlpha } from '../../../shared/vtt/colors.js';
import { pillLabelSx } from './panelStyles.js';
import { SectionLabel } from './ScenePanelSection.jsx';
import { OPACITY } from '../../../shared/ui/colors.js';
import { SURFACES } from '../../../shared/ui/surfaces.js';

// The scene panel's Pictures section: which picture is on show, the battlemap,
// the backgrounds, and images placed on the map as pieces.

export function pictureSummary(scene) {
  const backgrounds = Array.isArray(scene.backgrounds)
    ? scene.backgrounds.length
    : (scene.backgroundPath ? 1 : 0);
  if (!scene.imagePath && !backgrounds) return 'Nothing uploaded yet';
  const parts = [scene.imagePath ? 'Battlemap' : 'No battlemap'];
  parts.push(backgrounds ? `${backgrounds} background${backgrounds === 1 ? '' : 's'}` : 'no background');
  parts.push(scene.shownImage === 'background' ? 'background on show' : 'battlemap on show');
  return parts.join(' · ');
}

export function PicturesControls({
  scene, busy, hideSwitch, onShownImageChange,
  onUploadMap, onUploadBackground, onRemoveMap, onRemoveBackground, onAddImage,
}) {
  const mapRef = useRef(null);
  const backgroundRef = useRef(null);
  const extraRef = useRef(null);

  return (
    <>
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
    </>
  );
}

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
  ...SURFACES.mapControl,
  '& .MuiToggleButton-root:not(.Mui-selected)': { color: VTT_COLORS.textSecondary },
  '& .MuiToggleButton-root': { border: 0, px: 1, py: 0.5 },
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
