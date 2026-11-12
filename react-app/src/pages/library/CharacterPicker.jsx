import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Typography } from '@mui/material';
import { Download, Save } from 'lucide-react';
import { useAuth } from '../../shared/cloud/auth/AuthProvider.jsx';
import { useToast } from '../../shared/ui/ToastProvider.jsx';
import SheetDialog from '../../shared/ui/SheetDialog.jsx';
import {
  listAllCharacters, listMyCharacters, fetchCloudMeta, pullCharacter,
  deleteCloudCharacter, deleteOwnCloudCharacter, getCloudCharacter,
} from '../../shared/cloud/api/cloudCharacters.js';
import { deleteCharacter } from '../../shared/character/profile/store.js';
import { readRegistry, renameRegistryEntry, REGISTRY_META } from '../../shared/storage/localStorageRegistries.js';
import { downloadCharacterExport } from '../../shared/character/profile/characterExport.js';
import { loadCharacterRows, canDeleteRow, deletePlanFor } from './logic/characterRows.js';
import { shouldPullCloudCopy } from './logic/instanceRows.js';
import { formatUpdatedAt } from './logic/tools.js';
import InstanceRow from './components/InstanceRow.jsx';
import * as s from './styles.js';
import StatePanel from '../../shared/ui/StatePanel.jsx';
import { confirmAction } from '../../shared/ui/confirmAction.js';
import { promptText } from '../../shared/ui/promptText.js';
import { campaignSheetPath } from '../../shared/character/profile/characterRoutes.js';
import { failureMessage } from '../../shared/ui/busyAction.js';
import { LoadingLine } from '../../shared/ui/LoadStatus.jsx';
import { ICON_SIZES } from '../../shared/ui/iconSizes.js';
import { ErrorLine } from '../../shared/ui/LoadStatus.jsx';

// Cloud sheets (role-scoped) merged with locally saved characters into one
// list. Absorbs the old /gmsheets page: same role-aware heading, same
// stale-response guard, same Save/Export dialog, plus local-only rows and
// contextual delete routing (local / own-cloud / foreign-cloud-as-GM).
export default function CharacterPicker() {
  const { cloudEnabled, status, isGm, user, cloudActive } = useAuth();
  const myId = user?.id;
  const navigate = useNavigate();
  const { notify } = useToast();

  const [rows, setRows] = useState([]);
  // Starts true: the first render happens before `refresh` resolves, and an
  // initial `false` would flash the empty state ahead of the real list.
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openingId, setOpeningId] = useState(null);
  const [dialogRow, setDialogRow] = useState(null);
  // `refresh` fires twice while the profile loads: once with isGm still false
  // (owner-only) and again once isGm resolves true. The token guard makes
  // sure the earlier, narrower result can't clobber the later full list.
  const reqRef = useRef(0);

  const refresh = useCallback(async () => {
    const token = ++reqRef.current;
    setLoading(true);
    const listCloud = cloudActive ? (isGm ? listAllCharacters : listMyCharacters) : async () => [];
    const listLocal = () => readRegistry('gb_char_registry');
    const { rows: merged, error: cloudError } = await loadCharacterRows({ listCloud, listLocal });
    if (token !== reqRef.current) return;
    setRows(merged);
    setError(cloudError || '');
    setLoading(false);
  }, [cloudEnabled, status, isGm]);

  useEffect(() => { refresh(); }, [refresh]);

  const handleOpen = useCallback(async (row) => {
    const isOwn = row.origin === 'local' || row.owner === myId;
    if (!isOwn) {
      navigate(campaignSheetPath(row.id, { edit: isGm }));
      return;
    }
    const route = REGISTRY_META.gb_char_registry.route(row.id);
    if (cloudActive) {
      setOpeningId(row.id);
      let pulled = row.hasLocal;
      try {
        const meta = await fetchCloudMeta(row.id);
        if (meta) {
          // No local copy at all -> always pull, else the sheet route finds
          // nothing locally and renders blank.
          if (!row.hasLocal || shouldPullCloudCopy(row.localUpdatedAt, meta)) {
            await pullCharacter(row.id);
            pulled = true;
          }
        }
      } catch (_) { /* offline / not found -> fall through to the check below */ }
      setOpeningId(null);
      if (!pulled) {
        setError('Could not load this character (offline and no local copy).');
        return;
      }
    }
    navigate(route);
  }, [cloudEnabled, status, isGm, myId, navigate]);

  const handleRename = useCallback((row) => {
    const name = promptText('Character name', row.name);
    if (name && renameRegistryEntry('gb_char_registry', row.id, name)) refresh();
  }, [refresh]);

  const handleDelete = useCallback(async (row) => {
    const plan = deletePlanFor(row, { myId, isGm });
    if (!plan.confirmMessage) return;
    if (!confirmAction(plan.confirmMessage)) return;
    try {
      if (plan.cloud === 'own') await deleteOwnCloudCharacter(row.id);
      else if (plan.cloud === 'any') await deleteCloudCharacter(row.id);
      if (plan.local) deleteCharacter(row.id);
      refresh();
      notify('success', `Deleted "${row.name || row.id}".`);
    } catch (e) {
      notify('error', failureMessage('Could not delete the character.', e));
    }
  }, [myId, isGm, notify, refresh]);

  const downloadJson = async (row) => {
    try {
      const cloud = await getCloudCharacter(row.id, { reason: 'export' });
      downloadCharacterExport(cloud.data, row.name || row.id);
    } catch (e) {
      notify('error', failureMessage('Could not download the character.', e));
    }
  };

  const saveLocal = async (row) => {
    try {
      await pullCharacter(row.id);
      notify('success', `"${row.name || row.id}" saved locally.`);
    } catch (e) {
      notify('error', failureMessage('Could not save the character on this device.', e));
    }
  };

  return (
    <>
      <Typography sx={s.sectionHeadSx}>{isGm ? 'Players sheets' : 'My sheets'}</Typography>

      {error ? <ErrorLine sx={s.errorLineSx}>{error}</ErrorLine> : null}
      {loading && !rows.length ? <LoadingLine label="Loading sheets…" /> : null}

      {!loading && rows.length === 0 ? (
        <StatePanel sx={s.emptyStateSx}>
          {isGm
            ? "No sheets yet. Players' sheets show up here once they log in and edit."
            : 'No sheets yet. Create a character while logged in and it shows up here.'}
        </StatePanel>
      ) : (
        <Box sx={s.listSx}>
          {rows.map((row) => {
            const rowCanDelete = canDeleteRow(row, { myId, isGm });
            // Renaming a cloud-backed row would only touch the local copy;
            // the next refresh re-merges and the cloud name wins, silently
            // reverting it. No cloud rename in scope, so only local-only
            // rows expose rename.
            const rowCanRename = row.origin === 'local';
            return (
              <InstanceRow
                key={row.id}
                name={row.name}
                updatedAtLabel={formatUpdatedAt(row.updatedAt)}
                badge={{ kind: row.origin, label: row.origin === 'cloud' ? 'Cloud' : 'Local' }}
                subtitle={isGm && row.origin === 'cloud' ? (row.ownerUsername || '—') : null}
                opening={openingId === row.id}
                onOpen={() => handleOpen(row)}
                onRename={rowCanRename ? () => handleRename(row) : null}
                onDelete={rowCanDelete ? () => handleDelete(row) : null}
                extraAction={row.origin === 'cloud' ? { icon: Save, label: 'Save / Export', onClick: () => setDialogRow(row) } : null}
              />
            );
          })}
        </Box>
      )}

      <SheetDialog
        open={Boolean(dialogRow)}
        onClose={() => setDialogRow(null)}
        maxWidth="xs"
        title="Save Character"
        icon={<Save size={ICON_SIZES.xl} />}
        actions={(
          <Button onClick={() => setDialogRow(null)} variant="outlined" size="small" sx={{ color: 'text.secondary' }}>
            Cancel
          </Button>
        )}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, py: 0.5 }}>
          <Button
            fullWidth variant="outlined" color="secondary" startIcon={<Download size={ICON_SIZES.md} />}
            onClick={() => { downloadJson(dialogRow); setDialogRow(null); }} sx={{ justifyContent: 'flex-start', py: 1 }}
          >
            Download JSON
          </Button>
          <Button
            fullWidth variant="contained" color="primary" startIcon={<Save size={ICON_SIZES.md} />}
            onClick={() => { saveLocal(dialogRow); setDialogRow(null); }} sx={{ justifyContent: 'flex-start', py: 1 }}
          >
            Save local
          </Button>
        </Box>
      </SheetDialog>
    </>
  );
}
