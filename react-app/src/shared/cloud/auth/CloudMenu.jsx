import { useState, useEffect } from 'react';
import { Button, Menu, MenuItem, Divider, Typography, Box } from '@mui/material';
import { LogIn, LogOut, User, CloudUpload } from 'lucide-react';
import { useAuth } from './AuthProvider.jsx';
import AuthDialog from './AuthDialog.jsx';
import { pushCharacter, SHEET_CONFLICT } from '../api/cloudCharacters.js';
import { CLOUD_SYNC_EVENT, reportCloudSyncState } from '../sync/cloudSyncState.js';
import { isSyncExcluded, includeInSync } from '../sync/cloudSyncExclude.js';
import { useToast } from '../../ui/ToastProvider.jsx';
import { UI_COLORS } from '../../ui/colors.js';
import { FONT_SIZES } from '../../ui/fonts.js';
import { useEventListener } from '../../ui/useEventListener.js';
import { characterIdFromUrl } from '../../character/profile/characterRoutes.js';
import { failureMessage } from '../../ui/busyAction.js';
import { ONE_LINE_SX } from '../../ui/textStyles.js';
import { ICON_SIZES } from '../../ui/iconSizes.js';
import { appTopBarFontSx } from '../../ui/appBar.js';

// The "active sheet" for the cloud menu is the one in the URL (builder/charsheet
// ?char=…). We deliberately do NOT fall back to localStorage's gb:active_char:
// that id is stale on pages with no sheet (e.g. Home), which made the upload
// option wrongly appear there.
function resolveActiveCharId() {
  const fromUrl = characterIdFromUrl();
  return (fromUrl && fromUrl !== 'new') ? fromUrl : null;
}

// Lettered like every button in the app's top bar.
const loginBtnSx = appTopBarFontSx;

// The account name is shown on every screen size; a long one is cut short
// (the menu it opens shows it in full).
const usernameLabelSx = {
  ...ONE_LINE_SX,
  maxWidth: { xs: 110, sm: 180 },
};

// The account button: signed out, Log in opens the login panel straight away;
// signed in, the account's name opens its menu (upload, log out). Without the
// online features there is no account to offer, so nothing is drawn.
export default function CloudMenu({
  sx, buttonSx, canUploadDraft = false, onUploadDraft,
}) {
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
      if (e?.code === SHEET_CONFLICT) {
        // A cloud copy exists that this local copy was never aligned with:
        // nothing was overwritten. The open sheet asks which version to keep.
        reportCloudSyncState(id, 'conflict', e.message);
        return;
      }
      notify('error', failureMessage('Could not save the sheet to the cloud.', e));
    }
  };

  // Live status from the headless auto-sync engine.
  useEventListener(window, CLOUD_SYNC_EVENT, (e) => {
    const state = e?.detail?.state || 'idle';
    // Waiting for the debounce, or dropped: nothing to show yet.
    if (state === 'scheduled' || state === 'cancelled') return;
    // A conflict wrote nothing and needs a decision (the open sheet asks it).
    setSyncState(state === 'conflict' ? 'error' : state);
    if (state === 'error' || state === 'conflict') notify('error', failureMessage('Could not sync.', e.detail.error));
  });

  const dot = cloudEnabled && status === 'authed'
    ? (syncState === 'syncing' ? UI_COLORS.accent : syncState === 'error' ? UI_COLORS.danger : UI_COLORS.success)
    : null;

  const authed = cloudEnabled && status === 'authed';

  // Signed out with the menu open (a session ended elsewhere): the menu goes,
  // and does not open again by itself at the next sign-in.
  useEffect(() => {
    if (!authed) setAnchor(null);
  }, [authed]);

  if (!cloudEnabled) return null;

  return (
    <Box sx={{ display: 'inline-flex', ...sx }}>
      <Button
        size="small"
        variant="outlined"
        color="primary"
        startIcon={authed ? <User size={ICON_SIZES.sm} /> : <LogIn size={ICON_SIZES.sm} />}
        aria-label={authed ? `Account: ${username || 'signed in'}` : 'Log in'}
        aria-haspopup={authed ? 'menu' : 'dialog'}
        onClick={(e) => (authed ? setAnchor(e.currentTarget) : setAuthOpen(true))}
        sx={{ ...loginBtnSx, ...buttonSx }}
      >
        {authed
          ? <Box component="span" sx={usernameLabelSx}>{username || 'ACCOUNT'}</Box>
          : 'Log in'}
        {dot ? <Box component="span" sx={{ ml: 0.5, width: 7, height: 7, borderRadius: '50%', bgcolor: dot }} /> : null}
      </Button>

      <Menu anchorEl={anchor} open={authed && Boolean(anchor)} onClose={close}>
        <Box sx={{ px: 2, py: 0.5 }}>
          <Typography sx={{ fontSize: FONT_SIZES.md, color: 'text.secondary' }}>
            {username} · {role === 'gm' ? 'GM' : 'Player'}
          </Typography>
        </Box>
        <Divider />
        {[
          ...(canUploadDraft ? [
            <MenuItem key="uploaddraft" onClick={() => { close(); onUploadDraft?.(); }}>
              <CloudUpload size={ICON_SIZES.sm} style={{ marginRight: 8 }} /> Upload to cloud
            </MenuItem>,
            <Divider key="ddraft" />,
          ] : []),
          ...((excluded && !canUploadDraft) ? [
            <MenuItem key="savecloud" onClick={saveExcludedToCloud}>
              <CloudUpload size={ICON_SIZES.sm} style={{ marginRight: 8 }} /> Upload to cloud
            </MenuItem>,
            <Divider key="dsave" />,
          ] : []),
          <MenuItem key="out" onClick={async () => { close(); await signOut(); notify('success', 'Logged out.'); }}>
            <LogOut size={ICON_SIZES.sm} style={{ marginRight: 8 }} /> Log out
          </MenuItem>,
        ]}
      </Menu>

      <AuthDialog open={authOpen} onClose={() => setAuthOpen(false)} />
    </Box>
  );
}
