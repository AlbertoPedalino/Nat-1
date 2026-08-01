import { useState, useEffect } from 'react';
import { Button, Menu, MenuItem, Divider, Typography, Box, Tooltip } from '@mui/material';
import { LogIn, LogOut, User, CloudUpload } from 'lucide-react';
import { useAuth } from './AuthProvider.jsx';
import AuthDialog from './AuthDialog.jsx';
import { pushCharacter } from './cloudCharacters.js';
import { isSyncExcluded, includeInSync } from './cloudSyncExclude.js';
import { useToast } from '../ToastProvider.jsx';

// The "active sheet" for the cloud menu is the one in the URL (builder/charsheet
// ?char=…). We deliberately do NOT fall back to localStorage's gb:active_char:
// that id is stale on pages with no sheet (e.g. Home), which made the upload
// option wrongly appear there.
function resolveActiveCharId() {
  const fromUrl = new URLSearchParams(window.location.search).get('char');
  return (fromUrl && fromUrl !== 'new') ? fromUrl : null;
}

const loginBtnSx = {
  fontFamily: '"Cinzel", Georgia, serif',
  fontSize: '0.625rem',
  letterSpacing: '0.08em',
};

const SYNC_TEXT = {
  syncing: 'Saving…',
  synced: 'All changes saved',
  error: 'Sync error',
  idle: 'Auto-sync on',
};

export default function CloudMenu({ sx, buttonSx, canUploadDraft = false, onUploadDraft }) {
  const { cloudEnabled, status, username, role, signOut } = useAuth();
  const [anchor, setAnchor] = useState(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [syncState, setSyncState] = useState('idle');
  const [excluded, setExcluded] = useState(false);

  const { notify } = useToast();
  const close = () => setAnchor(null);

  // When opening the menu, check if the active sheet is excluded from sync
  // (e.g. it was imported from a JSON file) so we can offer to push it.
  useEffect(() => {
    if (anchor) setExcluded(isSyncExcluded(resolveActiveCharId()));
  }, [anchor]);

  const saveExcludedToCloud = async () => {
    close();
    const id = resolveActiveCharId();
    if (!id) { notify('warning', 'No active sheet.'); return; }
    includeInSync(id);
    setExcluded(false);
    try {
      await pushCharacter(id);
      notify('success', 'Sheet saved to cloud. Auto-sync is now on for it.');
    } catch (e) {
      notify('error', e?.message || 'Failed to save.');
    }
  };

  // Live status from the headless auto-sync engine.
  useEffect(() => {
    const onSync = (e) => {
      const state = e?.detail?.state || 'idle';
      setSyncState(state);
      if (state === 'error') notify('error', `Sync failed: ${e.detail.error || ''}`);
    };
    window.addEventListener('gb:cloud-sync', onSync);
    return () => window.removeEventListener('gb:cloud-sync', onSync);
  }, []);

  if (!cloudEnabled) {
    return (
      <Tooltip title="Online features not configured">
        <span style={{ display: 'inline-flex' }}>
          <Button size="small" variant="outlined" disabled startIcon={<LogIn size={14} />} sx={{ ...loginBtnSx, ...buttonSx }}>
            LOGIN
          </Button>
        </span>
      </Tooltip>
    );
  }

  const dot = status === 'authed'
    ? (syncState === 'syncing' ? '#d6a849' : syncState === 'error' ? '#de675f' : '#58b879')
    : null;

  return (
    <Box sx={{ display: 'inline-flex', ...sx }}>
      <Button
        size="small"
        variant="outlined"
        color="primary"
        startIcon={status === 'authed' ? <User size={14} /> : <LogIn size={14} />}
        onClick={(e) => setAnchor(e.currentTarget)}
        sx={{ ...loginBtnSx, ...buttonSx }}
      >
        {status === 'authed' ? (username || 'ACCOUNT') : 'LOGIN'}
        {dot ? <Box component="span" sx={{ ml: 0.6, width: 7, height: 7, borderRadius: '50%', bgcolor: dot }} /> : null}
      </Button>

      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={close}>
        {status === 'authed' ? [
          <Box key="hdr" sx={{ px: 2, py: 0.5 }}>
            <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
              {username} · {role === 'gm' ? 'GM' : 'Player'}
            </Typography>
            <Typography sx={{ fontSize: '0.62rem', color: syncState === 'error' ? '#de675f' : '#58b879' }}>
              {SYNC_TEXT[syncState] || SYNC_TEXT.idle}
            </Typography>
          </Box>,
          <Divider key="d1" />,
          ...(canUploadDraft ? [
            <MenuItem key="uploaddraft" onClick={() => { close(); onUploadDraft?.(); }}>
              <CloudUpload size={15} style={{ marginRight: 8 }} /> Upload to cloud
            </MenuItem>,
            <Divider key="ddraft" />,
          ] : []),
          ...((excluded && !canUploadDraft) ? [
            <MenuItem key="savecloud" onClick={saveExcludedToCloud}>
              <CloudUpload size={15} style={{ marginRight: 8 }} /> Upload to cloud
            </MenuItem>,
            <Divider key="dsave" />,
          ] : []),
          <MenuItem key="out" onClick={async () => { close(); await signOut(); notify('info', 'Logged out.'); }}>
            <LogOut size={15} style={{ marginRight: 8 }} /> Log out
          </MenuItem>,
        ] : (
          <MenuItem onClick={() => { close(); setAuthOpen(true); }}>
            <LogIn size={15} style={{ marginRight: 8 }} /> Log in / Sign up
          </MenuItem>
        )}
      </Menu>

      <AuthDialog open={authOpen} onClose={() => setAuthOpen(false)} />
    </Box>
  );
}
