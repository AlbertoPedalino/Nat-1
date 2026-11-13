import { useCallback } from 'react';
import { LAYERS } from '../../shared/ui/layers.js';
import { Box, Portal } from '@mui/material';
import { APP_TOP_BAR_HEIGHT } from '../../shared/ui/appBar.js';
import { activePortalContainer } from '../../shared/ui/portalContainer.js';
import { CompendiumFrame } from './CompendiumHome.jsx';
import { useCompendium } from './data/loadCompendium.js';
import { CloseButton } from '../../shared/ui/CornerCloseButton.jsx';

// The compendium beside a session (battle map, DM Screen): a side panel on the
// left that leaves the page usable — the creature stat block takes the right.
// Mounted inside a fullscreen map, when there is one. Loads on first opening.
export default function CompendiumPanel({ open, onClose }) {
  if (!open) return null;
  return <OpenPanel onClose={onClose} />;
}

function OpenPanel({ onClose }) {
  const compendium = useCompendium();
  const handleKeyDown = useCallback((event) => {
    if (event.key === 'Escape' && !event.defaultPrevented) onClose?.();
  }, [onClose]);
  return (
    <Portal container={activePortalContainer}>
      <Box role="dialog" aria-label="Compendium" data-viewport-control onKeyDown={handleKeyDown} sx={panelSx}>
        <CompendiumFrame
          compendium={compendium}
          layout="panel"
          autoFocus
          sx={{ height: '100%' }}
          action={(
            <CloseButton onClose={onClose} label="Close the compendium" />
          )}
        />
      </Box>
    </Portal>
  );
}

// Below the app's top bar and under menus, like the stat block panel.
const panelSx = {
  position: 'fixed',
  zIndex: LAYERS.compendium,
  top: `calc(${APP_TOP_BAR_HEIGHT} + 8px)`,
  left: { xs: 8, sm: 16 },
  bottom: { xs: 8, sm: 16 },
  width: { xs: 'calc(100% - 16px)', sm: 420 },
};
