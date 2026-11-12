import { useRef } from 'react';
import { Box, Button, Stack } from '@mui/material';
import { Grid3x3, Image as ImageIcon, ImagePlus, Trash2 } from 'lucide-react';
import MapSectionTitle from '../map/MapSectionTitle.jsx';
import { ICON_SIZES } from '../../../shared/ui/iconSizes.js';
import TipIconButton from '../../../shared/ui/TipIconButton.jsx';
import ChoiceToggle from '../../../shared/ui/ChoiceToggle.jsx';

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

      <MapSectionTitle>Battlemap</MapSectionTitle>
      <Stack direction="row" spacing={0.5}>
        <Button size="small" variant="outlined" fullWidth disabled={busy} onClick={() => mapRef.current?.click()}>
          {scene.imagePath ? 'Replace map' : 'Upload map'}
        </Button>
        {scene.imagePath ? (
          <TipIconButton title="Remove battlemap" size="small" color="error" disabled={busy} onClick={onRemoveMap}>
            <Trash2 size={ICON_SIZES.sm} />
          </TipIconButton>
        ) : null}
      </Stack>

      <MapSectionTitle hint="Establishing shots without a grid. A scene can hold several; switch between them from the strip at the bottom of the map while the background is on show.">Backgrounds</MapSectionTitle>
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
          <TipIconButton title="Remove the background on show" size="small" color="error" disabled={busy} ariaLabel="Remove background" onClick={() => onRemoveBackground()}>
            <Trash2 size={ICON_SIZES.sm} />
          </TipIconButton>
        ) : null}
      </Stack>

      {/* Anything else that belongs on the map — a rug, a door, a handout — is a
          piece on the map layer, so it can be moved, resized and removed like
          everything else instead of being a third special slot. */}
      <MapSectionTitle hint="It lands on the layer you are editing. Click it to get its corner handles: the corner moves each side on its own — drag it diagonally to scale, sideways or downwards to stretch — and the top handle turns it.">Images on the map</MapSectionTitle>
      <Button
        size="small"
        variant="outlined"
        fullWidth
        startIcon={<ImagePlus size={ICON_SIZES.sm} />}
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
    <ChoiceToggle
      fullWidth={!compact}
      onMap={compact}
      ariaLabel="Shown image"
      value={scene.shownImage}
      onChange={onShownImageChange}
      options={[
        { value: 'map', icon: Grid3x3, label: 'Battlemap', ariaLabel: 'Show the battlemap' },
        { value: 'background', icon: ImageIcon, label: 'Background', ariaLabel: 'Show the background' },
      ]}
    />
  );
}

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
