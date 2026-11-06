import { Stack } from '@mui/material';
import { Frame, Grid3x3, Image as ImageIcon, SunMedium } from 'lucide-react';
import { PanelSection } from './ScenePanelSection.jsx';
import { useOpenSections } from './useOpenSections.js';
import { PicturesControls, pictureSummary } from './PicturesControls.jsx';
import { LightWeatherControls, lookSummary } from './LightWeatherControls.jsx';
import { GridControls, gridSummary } from './GridControls.jsx';
import { PlayAreaControls, playAreaSummary } from './PlayAreaControls.jsx';

// The GM's scene panel (MapCorner): four collapsible sections — Pictures,
// Light & weather (per-picture light filter and atmosphere), Grid, Play area —
// plus the picture switch also shown compact in the scene bar. Each section's
// controls and closed-header summary live in their own file next to this one.
export function MapPanel({
  scene, busy, onUploadMap, onUploadBackground, onRemoveMap, onRemoveBackground,
  onShownImageChange, onAddImage,
  onGridChange, onAtmosphereChange, onImageFilterChange, onPlayAreaChange, onFitPlayArea,
  // The switch has its own place on the map when this panel sits under it.
  hideSwitch = false,
}) {
  const [openSections, toggleSection] = useOpenSections();
  const sectionProps = (id) => ({ id, open: openSections.includes(id), onToggle: toggleSection });

  return (
    <Stack spacing={0.75}>
      <PanelSection
        {...sectionProps('pictures')}
        icon={ImageIcon}
        title="Pictures"
        summary={pictureSummary(scene)}
      >
        <PicturesControls
          scene={scene}
          busy={busy}
          hideSwitch={hideSwitch}
          onShownImageChange={onShownImageChange}
          onUploadMap={onUploadMap}
          onUploadBackground={onUploadBackground}
          onRemoveMap={onRemoveMap}
          onRemoveBackground={onRemoveBackground}
          onAddImage={onAddImage}
        />
      </PanelSection>

      <PanelSection
        {...sectionProps('mood')}
        icon={SunMedium}
        title="Light & weather"
        summary={lookSummary(scene)}
      >
        <LightWeatherControls
          scene={scene}
          onImageFilterChange={onImageFilterChange}
          onAtmosphereChange={onAtmosphereChange}
        />
      </PanelSection>

      <PanelSection
        {...sectionProps('grid')}
        icon={Grid3x3}
        title="Grid"
        summary={gridSummary(scene.grid)}
      >
        <GridControls grid={scene.grid} onGridChange={onGridChange} />
      </PanelSection>

      <PanelSection
        {...sectionProps('playArea')}
        icon={Frame}
        title="Play area"
        summary={playAreaSummary(scene)}
      >
        <PlayAreaControls
          scene={scene}
          busy={busy}
          onPlayAreaChange={onPlayAreaChange}
          onFitPlayArea={onFitPlayArea}
        />
      </PanelSection>
    </Stack>
  );
}
