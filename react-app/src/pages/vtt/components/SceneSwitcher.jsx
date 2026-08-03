import { useCallback, useState } from 'react';
import {
  CircularProgress, IconButton, ListItemIcon, Menu, MenuItem, Tooltip, Typography,
} from '@mui/material';
import { Layers, Radio } from 'lucide-react';
import { listScenes } from '../../../shared/cloud/vtt.js';
import { battleMapDialogPaperSx } from './battleMapSurface.js';

// Moving the table from the tavern to the crypt without going back to the scene
// list. GM only: a player has no scenes to list — RLS hands them the live one
// and nothing else — and no business choosing which map they are on.
//
// The list is fetched when the menu opens rather than on mount, so a session
// that never changes scene never pays for the query, and a session that does
// gets the names as they are now instead of as they were when the map loaded.
export default function SceneSwitcher({ scene, onOpenScene }) {
  const [anchor, setAnchor] = useState(null);
  const [scenes, setScenes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const open = useCallback(async (event) => {
    setAnchor(event.currentTarget);
    setLoading(true);
    try {
      const list = await listScenes(scene.campaignId);
      setScenes(list);
      setError('');
    } catch (cause) {
      setError(cause?.message || 'Could not load the scenes.');
    } finally {
      setLoading(false);
    }
  }, [scene.campaignId]);

  const close = useCallback(() => setAnchor(null), []);

  const choose = useCallback((id) => {
    close();
    if (id !== scene.id) onOpenScene(id);
  }, [close, onOpenScene, scene.id]);

  return (
    <>
      <Tooltip title="Switch scene">
        <IconButton
          size="small"
          aria-label="Switch scene"
          aria-controls={anchor ? 'scene-switcher-menu' : undefined}
          aria-haspopup="menu"
          aria-expanded={anchor ? 'true' : undefined}
          onClick={open}
          sx={buttonSx}
        >
          <Layers size={17} />
        </IconButton>
      </Tooltip>
      <Menu
        id="scene-switcher-menu"
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={close}
        slotProps={{ paper: { sx: menuPaperSx } }}
      >
        {loading && !scenes.length ? (
          <MenuItem disabled sx={noticeSx}><CircularProgress size={16} /></MenuItem>
        ) : null}
        {error ? <MenuItem disabled sx={errorSx}>{error}</MenuItem> : null}
        {!loading && !error && !scenes.length ? (
          <MenuItem disabled sx={noticeSx}>No other scene in this campaign.</MenuItem>
        ) : null}
        {scenes.map((entry) => (
          <MenuItem
            key={entry.id}
            selected={entry.id === scene.id}
            onClick={() => choose(entry.id)}
          >
            <ListItemIcon sx={iconSx}>
              {entry.isLive ? <Radio size={15} /> : null}
            </ListItemIcon>
            <Typography noWrap sx={nameSx}>{entry.name}</Typography>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

// Matches the other square controls in the scene topbar.
const buttonSx = {
  width: 30,
  height: 30,
  flexShrink: 0,
  color: 'rgba(255,255,255,0.68)',
  border: '1px solid rgba(255,255,255,0.16)',
  borderRadius: 1,
  '&:hover': {
    color: '#e8c96a',
    borderColor: 'rgba(232,201,106,0.42)',
    bgcolor: 'rgba(232,201,106,0.08)',
  },
};

// Same glass as the bar this hangs from.
const menuPaperSx = {
  ...battleMapDialogPaperSx,
  maxHeight: 360,
  minWidth: 220,
};

const noticeSx = {
  color: 'text.secondary',
  fontSize: '0.8rem',
};

const errorSx = {
  color: 'error.main',
  fontSize: '0.8rem',
  whiteSpace: 'normal',
};

// Reserved even when the scene is not live, so the names stay on one column
// instead of shifting around the broadcast mark.
const iconSx = {
  minWidth: 24,
  color: 'primary.main',
};

const nameSx = {
  minWidth: 0,
  fontSize: '0.85rem',
};
