import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useAuth } from '../../shared/cloud/AuthProvider.jsx';
import { getCloudSection } from '../../shared/cloud/cloudSections.js';
import {
  cancelPendingRegistryPush,
  deleteRegistryEntry,
  readRegistry,
  renameRegistryEntry,
} from '../../shared/localStorageRegistries.js';
import InstanceRow from './components/InstanceRow.jsx';
import {
  loadInstanceRows,
  mergeInstanceRows,
  sectionDeletePlan,
  shouldPullCloudCopy,
} from './logic/instanceRows.js';
import { formatUpdatedAt } from './logic/tools.js';
import * as s from './styles.js';

export default function SectionPicker({ meta }) {
  const { cloudEnabled, status } = useAuth();
  const navigate = useNavigate();
  const api = getCloudSection(meta.sectionKey);
  const [rows, setRows] = useState(() => mergeInstanceRows([], readRegistry(meta.registryKey)));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [openingId, setOpeningId] = useState(null);
  const requestRef = useRef(0);

  const refresh = useCallback(async () => {
    const token = ++requestRef.current;
    const canQueryCloud = cloudEnabled && status === 'authed';
    setLoading(canQueryCloud);
    const result = await loadInstanceRows({
      listLocal: () => readRegistry(meta.registryKey),
      listCloud: canQueryCloud ? api.listInstances : async () => [],
    });
    if (token !== requestRef.current) return;
    setRows(result.rows);
    if (result.error) setError(result.error);
    else if (!cloudEnabled) setError('Cloud sync is not configured; showing local saves.');
    else if (status === 'anon') setError('Sign in to see cloud saves; showing local saves.');
    else setError('');
    setLoading(false);
  }, [api, cloudEnabled, meta.registryKey, status]);

  useEffect(() => { refresh(); }, [refresh]);

  const handleOpen = useCallback(async (row) => {
    if (!cloudEnabled || status !== 'authed') {
      navigate(meta.route(row.id));
      return;
    }
    setOpeningId(row.id);
    let hasLocal = row.hasLocal;
    try {
      const cloudMeta = await api.fetchInstanceMeta(row.id);
      if (shouldPullCloudCopy(row.localUpdatedAt, cloudMeta)) {
        await api.pullInstance(row.id);
        hasLocal = true;
      }
    } catch (cause) {
      setError(cause?.message || 'Could not refresh this cloud save.');
    } finally {
      setOpeningId(null);
    }
    if (!hasLocal) {
      setError('Could not load this cloud save (offline and no local copy).');
      return;
    }
    navigate(meta.route(row.id));
  }, [api, cloudEnabled, meta, navigate, status]);

  const handleRename = useCallback(async (row) => {
    const nextName = window.prompt('Nome salvataggio', row.name);
    const name = String(nextName || '').trim();
    if (!name || name === row.name) return;

    try {
      if (row.origin === 'cloud') {
        await api.renameCloudInstance(row.id, name);
      }
      if (row.hasLocal) renameRegistryEntry(meta.registryKey, row.id, name);
      await refresh();
    } catch (cause) {
      setError(cause?.message || 'Failed to rename cloud save.');
    }
  }, [api, meta.registryKey, refresh]);

  const handleDelete = useCallback(async (row) => {
    const plan = sectionDeletePlan(row);
    if (!plan.confirmMessage || !window.confirm(plan.confirmMessage)) return;
    try {
      if (plan.cloud) {
        cancelPendingRegistryPush(meta.registryKey, row.id);
        await api.deleteCloudInstance(row.id);
      }
      if (plan.local) deleteRegistryEntry(meta.registryKey, row.id, { confirm: false });
      refresh();
    } catch (cause) {
      setError(cause?.message || 'Failed to delete cloud save.');
    }
  }, [api, meta.registryKey, refresh]);

  return (
    <>
      {error ? <Typography sx={s.errorTextSx}>{error}</Typography> : null}
      {loading && !rows.length ? <CircularProgress size={22} /> : null}
      {!loading && !rows.length ? (
        <Box sx={s.emptyBoxSx}>
          <Typography sx={s.emptyTextSx}>No saved {meta.label.toLowerCase()} sessions yet.</Typography>
        </Box>
      ) : (
        <Box sx={s.listSx}>
          {rows.map((row) => (
            <InstanceRow
              key={row.id}
              name={row.name}
              updatedAtLabel={formatUpdatedAt(row.updatedAt)}
              badge={{ kind: row.origin, label: row.origin === 'cloud' ? 'Cloud' : 'Local' }}
              opening={openingId === row.id}
              onOpen={() => handleOpen(row)}
              onRename={() => handleRename(row)}
              onDelete={() => handleDelete(row)}
            />
          ))}
        </Box>
      )}
    </>
  );
}
