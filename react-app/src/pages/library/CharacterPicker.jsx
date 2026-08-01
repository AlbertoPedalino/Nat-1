import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Typography, CircularProgress } from '@mui/material';
import { Download, Save } from 'lucide-react';
import { useAuth } from '../../shared/cloud/AuthProvider.jsx';
import { useToast } from '../../shared/ToastProvider.jsx';
import SheetDialog from '../../shared/character/SheetDialog.jsx';
import {
  listAllCharacters, listMyCharacters, fetchCloudMeta, pullCharacter,
  deleteCloudCharacter, deleteOwnCloudCharacter,
} from '../../shared/cloud/cloudCharacters.js';
import { deleteCharacter } from '../../shared/character/store.js';
import { readRegistry, renameRegistryEntry, REGISTRY_META } from '../../shared/localStorageRegistries.js';
import { createCharacterExport } from '../charbuilder/logic/characterExport.js';
import { supabase } from '../../shared/cloud/supabaseClient.js';
import { loadCharacterRows, canDeleteRow, deletePlanFor } from './logic/characterRows.js';
import { formatUpdatedAt } from './logic/tools.js';
import InstanceRow from './components/InstanceRow.jsx';
import * as s from './styles.js';

// Cloud sheets (role-scoped) merged with locally saved characters into one
// list. Absorbs the old /gmsheets page: same role-aware heading, same
// stale-response guard, same Save/Export dialog, plus local-only rows and
// contextual delete routing (local / own-cloud / foreign-cloud-as-GM).
export default function CharacterPicker() {
  const { cloudEnabled, status, isGm, user } = useAuth();
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
    const canQueryCloud = cloudEnabled && status === 'authed';
    const listCloud = canQueryCloud ? (isGm ? listAllCharacters : listMyCharacters) : async () => [];
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
      navigate(`/campaign-sheet?id=${encodeURIComponent(row.id)}${isGm ? '&edit=1' : ''}`);
      return;
    }
    const route = REGISTRY_META.gb_char_registry.route(row.id);
    if (cloudEnabled && status === 'authed') {
      setOpeningId(row.id);
      let pulled = row.hasLocal;
      try {
        const meta = await fetchCloudMeta(row.id);
        if (meta) {
          const cloudUpdated = Date.parse(meta.updated_at) || 0;
          // No local copy at all -> always pull, else the sheet route finds
          // nothing locally and renders blank.
          if (!row.hasLocal || cloudUpdated > row.localUpdatedAt) {
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
    if (renameRegistryEntry('gb_char_registry', row.id)) refresh();
  }, [refresh]);

  const handleDelete = useCallback(async (row) => {
    const plan = deletePlanFor(row, { myId, isGm });
    if (!plan.confirmMessage) return;
    if (!window.confirm(plan.confirmMessage)) return;
    try {
      if (plan.cloud === 'own') await deleteOwnCloudCharacter(row.id);
      else if (plan.cloud === 'any') await deleteCloudCharacter(row.id);
      if (plan.local) deleteCharacter(row.id);
      refresh();
    } catch (e) {
      setError(e?.message || 'Failed to delete.');
    }
  }, [myId, isGm, refresh]);

  const downloadJson = async (row) => {
    try {
      const { data, error: err } = await supabase.from('characters').select('data').eq('id', row.id).single();
      if (err) throw err;
      const blob = new Blob([JSON.stringify(createCharacterExport(data.data), null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${row.name || row.id}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e?.message || 'Failed to download.');
    }
  };

  const saveLocal = async (row) => {
    try {
      await pullCharacter(row.id);
      notify('success', `"${row.name || row.id}" saved locally.`);
    } catch (e) {
      notify('error', e?.message || 'Failed to save locally.');
    }
  };

  return (
    <>
      <Typography sx={s.sectionHeadSx}>{isGm ? 'Players sheets' : 'My sheets'}</Typography>

      {error ? <Typography sx={s.errorTextSx}>{error}</Typography> : null}
      {loading && !rows.length ? <CircularProgress size={22} /> : null}

      {!loading && rows.length === 0 ? (
        <Box sx={s.emptyBoxSx}>
          <Typography sx={s.emptyTextSx}>
            {isGm
              ? "No sheets yet. Players' sheets show up here once they log in and edit."
              : 'No sheets yet. Create a character while logged in and it shows up here.'}
          </Typography>
        </Box>
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
        icon={<Save size={20} />}
        actions={(
          <Button onClick={() => setDialogRow(null)} variant="outlined" size="small" sx={{ color: 'text.secondary' }}>
            Cancel
          </Button>
        )}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, py: 0.5 }}>
          <Button
            fullWidth variant="outlined" color="secondary" startIcon={<Download size={16} />}
            onClick={() => { downloadJson(dialogRow); setDialogRow(null); }} sx={{ justifyContent: 'flex-start', py: 1 }}
          >
            Download JSON
          </Button>
          <Button
            fullWidth variant="contained" color="primary" startIcon={<Save size={16} />}
            onClick={() => { saveLocal(dialogRow); setDialogRow(null); }} sx={{ justifyContent: 'flex-start', py: 1 }}
          >
            Save local
          </Button>
        </Box>
      </SheetDialog>
    </>
  );
}
