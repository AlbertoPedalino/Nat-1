import { useCallback, useState } from 'react';
import { CircularProgress, ListItemIcon, MenuItem, Typography } from '@mui/material';
import { Layers, Radio } from 'lucide-react';
import { listScenes } from '../../../shared/cloud/api/vttScenes.js';
import { VTT_COLORS, vttAlpha } from '../../../shared/vtt/colors.js';
import MapMenu from '../map/MapMenu.jsx';
import { failureMessage } from '../../../shared/ui/busyAction.js';
import { FONT_SIZES } from '../../../shared/ui/fonts.js';
import { OPACITY } from '../../../shared/ui/colors.js';
import { ICON_SIZES } from '../../../shared/ui/iconSizes.js';
import { INK_EDGE } from '../../../shared/ui/shadows.js';
import TipIconButton from '../../../shared/ui/TipIconButton.jsx';

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
      setError(failureMessage('Could not load the scenes.', cause));
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
      <TipIconButton title="Switch scene" size="small" aria-controls={anchor ? 'scene-switcher-menu' : undefined} aria-haspopup="menu" aria-expanded={anchor ? 'true' : undefined} onClick={open} sx={buttonSx}>
        <Layers size={ICON_SIZES.md} />
      </TipIconButton>
      {/* The same glass as the bar this hangs from. */}
      <MapMenu id="scene-switcher-menu" anchorEl={anchor} onClose={close} minWidth={220} maxHeight={360}>
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
              {entry.isLive ? <Radio size={ICON_SIZES.sm} /> : null}
            </ListItemIcon>
            <Typography noWrap sx={nameSx}>{entry.name}</Typography>
          </MenuItem>
        ))}
      </MapMenu>
    </>
  );
}

// Matches the other square controls in the scene topbar.
const buttonSx = {
  width: 30,
  height: 30,
  flexShrink: 0,
  color: vttAlpha(VTT_COLORS.white, OPACITY.heavy),
  border: INK_EDGE,
  borderRadius: 1,
  '&:hover': {
    color: VTT_COLORS.accent,
    borderColor: vttAlpha(VTT_COLORS.accent, OPACITY.edge),
    bgcolor: vttAlpha(VTT_COLORS.accent, OPACITY.soft),
  },
};

const noticeSx = {
  color: 'text.secondary',
  fontSize: FONT_SIZES.xl,
};

const errorSx = {
  color: 'error.main',
  fontSize: FONT_SIZES.xl,
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
  fontSize: FONT_SIZES.xxl,
};
