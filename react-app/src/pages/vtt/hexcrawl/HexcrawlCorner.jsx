import { useState } from 'react';
import { Hexagon, Settings } from 'lucide-react';
import HexcrawlPanel from './HexcrawlPanel.jsx';
import HexcrawlSettingsDialog from './HexcrawlSettingsDialog.jsx';
import MapCornerPopout from '../map/MapCornerPopout.jsx';

// Top left, beside the picture settings: the hexcrawl is how this map is played
// rather than a tool you pick up, so it belongs with the scene's own settings
// and not in the rail of brushes and rulers.
//
// The corner reports; the gear opens the settings, centred and full size, for
// the moments the table decides something has changed.
export default function HexcrawlCorner({ open = false, onOpenChange, ...props }) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const openSettings = () => setSettingsOpen(true);

  return (
    <>
      <MapCornerPopout
        icon={Hexagon}
        label="Hexcrawl"
        showTip="Hexcrawl: time, weather, travel"
        hideTip="Hide the hexcrawl"
        open={open}
        onOpenChange={onOpenChange}
        title="Hexcrawl"
        actions={[{ title: 'Hexcrawl settings', icon: Settings, onClick: openSettings }]}
      >
        <HexcrawlPanel {...props} onOpenSettings={openSettings} />
      </MapCornerPopout>

      <HexcrawlSettingsDialog
        {...props}
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </>
  );
}
