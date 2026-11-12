import { Images } from 'lucide-react';
import { MapPanel } from './MapPanel.jsx';
import MapCornerPopout from '../map/MapCornerPopout.jsx';

// Everything about the scene behind one icon: its pictures, atmosphere, grid
// and playable edge. They were split across two corners for a while and
// finishing a single thought meant crossing the map.
//
// Only the icon sits on the map: the switch lives with the rest of the picture
// settings, one click away, instead of taking a permanent strip of the board.
export default function MapCorner({
  scene,
  busy,
  open = false,
  onOpenChange,
  onShownImageChange,
  onUploadMap,
  onUploadBackground,
  onRemoveMap,
  onRemoveBackground,
  onAddImage,
  onGridChange,
  onAtmosphereChange,
  onImageFilterChange,
  onPlayAreaChange,
  onFitPlayArea,
}) {
  return (
    <MapCornerPopout
      icon={Images}
      label="Picture settings"
      showTip="Pictures, atmosphere, grid and play area"
      hideTip="Hide the scene settings"
      open={open}
      onOpenChange={onOpenChange}
      title="Scene"
    >
      <MapPanel
        scene={scene}
        busy={busy}
        onUploadMap={onUploadMap}
        onUploadBackground={onUploadBackground}
        onRemoveMap={onRemoveMap}
        onRemoveBackground={onRemoveBackground}
        onAddImage={onAddImage}
        onGridChange={onGridChange}
        onAtmosphereChange={onAtmosphereChange}
        onImageFilterChange={onImageFilterChange}
        onPlayAreaChange={onPlayAreaChange}
        onFitPlayArea={onFitPlayArea}
        onShownImageChange={onShownImageChange}
      />
    </MapCornerPopout>
  );
}
