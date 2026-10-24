import { useCallback } from 'react';
import {
  Box, IconButton, Paper, Portal, Typography,
} from '@mui/material';
import { BookOpen, X } from 'lucide-react';
import { APP_TOP_BAR_HEIGHT } from '../../app/navigation/AppTopBar.jsx';
import { fullscreenContainer } from '../vtt/map/fullscreenContainer.js';
import CompendiumHome from './CompendiumHome.jsx';
import { useCompendium } from './loadCompendium.js';

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
    <Portal container={fullscreenContainer}>
      <Paper role="dialog" aria-label="Compendium" data-viewport-control onKeyDown={handleKeyDown} sx={panelSx}>
        <Box sx={headerSx}>
          <BookOpen size={16} />
          <Typography sx={titleSx}>Compendium</Typography>
          <IconButton size="small" aria-label="Close the compendium" onClick={onClose} sx={{ ml: 'auto' }}>
            <X size={16} />
          </IconButton>
        </Box>
        <Box sx={{ flex: 1, minHeight: 0 }}>
          <CompendiumHome compendium={compendium} layout="panel" autoFocus />
        </Box>
      </Paper>
    </Portal>
  );
}

// Below the app's top bar and under menus, like the stat block panel.
const panelSx = {
  position: 'fixed',
  zIndex: 1250,
  top: `calc(${APP_TOP_BAR_HEIGHT} + 8px)`,
  left: { xs: 8, sm: 16 },
  bottom: { xs: 8, sm: 16 },
  width: { xs: 'calc(100% - 16px)', sm: 420 },
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  bgcolor: 'background.paper',
  backgroundImage: 'none',
  border: '1px solid',
  borderColor: 'divider',
  boxShadow: 12,
};

const headerSx = {
  display: 'flex',
  alignItems: 'center',
  gap: 1,
  px: 1.5,
  py: 1,
  color: 'primary.main',
  borderBottom: '1px solid',
  borderColor: 'divider',
  flexShrink: 0,
};

const titleSx = {
  fontFamily: '"Cinzel", Georgia, serif',
  fontSize: '0.8rem',
  fontWeight: 700,
  letterSpacing: '0.08em',
};
