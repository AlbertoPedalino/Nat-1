import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import { useAuth } from '../../shared/cloud/auth/AuthProvider.jsx';
import { listInstances, renameInstance } from '../../shared/instances/instanceStore.js';
import {
  deleteInstance,
  listToolInstances,
  mergeInstanceRows,
  renameCloudInstance,
} from '../../shared/instances/instanceSync.js';
import InstanceRow from './components/InstanceRow.jsx';
import { sectionDeletePlan } from './logic/instanceRows.js';
import { formatUpdatedAt } from './logic/tools.js';
import * as s from './styles.js';
import StatePanel from '../../shared/ui/StatePanel.jsx';
import { confirmAction } from '../../shared/ui/confirmAction.js';
import { promptText } from '../../shared/ui/promptText.js';
import { useToast } from '../../shared/ui/ToastProvider.jsx';
import { failureMessage } from '../../shared/ui/busyAction.js';
import { LoadingLine } from '../../shared/ui/LoadStatus.jsx';

// Opening only navigates: the tool page opens the instance (pulling a cloud
// copy this browser lacks, refreshing a linked one) through the shared
// instance layer, exactly as for a link or a bookmark.
export default function SectionPicker({ meta }) {
  const { cloudEnabled, status, cloudActive } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState(() => mergeInstanceRows(meta.sectionKey, [], listInstances(meta.sectionKey)));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { notify } = useToast();
  const requestRef = useRef(0);

  const refresh = useCallback(async () => {
    const token = ++requestRef.current;
    setLoading(cloudActive);
    const result = await listToolInstances(meta.sectionKey, { includeCloud: cloudActive });
    if (token !== requestRef.current) return;
    setRows(result.rows);
    if (result.error) setError(result.error);
    else if (!cloudEnabled) setError('Cloud sync is not configured; showing local saves.');
    else if (status === 'anon') setError('Sign in to see cloud saves; showing local saves.');
    else setError('');
    setLoading(false);
  }, [cloudEnabled, meta.sectionKey, status]);

  useEffect(() => { refresh(); }, [refresh]);

  const handleRename = useCallback(async (row) => {
    const name = promptText('Save name', row.name);
    if (!name || name === row.name) return;
    try {
      if (row.hasLocal) renameInstance(meta.sectionKey, row.id, name);
      else await renameCloudInstance(meta.sectionKey, row.id, name);
      await refresh();
      notify('success', `Renamed to "${name}".`);
    } catch (cause) {
      notify('error', failureMessage('Could not rename the save.', cause));
    }
  }, [meta.sectionKey, notify, refresh]);

  const handleDelete = useCallback(async (row) => {
    const plan = sectionDeletePlan(row);
    if (!plan.confirmMessage || !confirmAction(plan.confirmMessage)) return;
    try {
      await deleteInstance(meta.sectionKey, row.id, { cloud: plan.cloud });
      refresh();
      notify('success', `Deleted "${row.name || row.id}".`);
    } catch (cause) {
      notify('error', failureMessage('Could not delete the save.', cause));
    }
  }, [meta.sectionKey, notify, refresh]);

  return (
    <>
      {error ? <Typography sx={s.errorTextSx}>{error}</Typography> : null}
      {loading && !rows.length ? <LoadingLine label="Loading saves…" /> : null}
      {!loading && !rows.length ? (
        <StatePanel sx={s.emptyStateSx}>No saved {meta.label.toLowerCase()} sessions yet.</StatePanel>
      ) : (
        <Box sx={s.listSx}>
          {rows.map((row) => (
            <InstanceRow
              key={row.id}
              name={row.name}
              updatedAtLabel={formatUpdatedAt(row.updatedAt)}
              badge={{ kind: row.origin, label: row.origin === 'cloud' ? 'Cloud' : 'Local' }}
              onOpen={() => navigate(meta.route(row.id))}
              onRename={() => handleRename(row)}
              onDelete={() => handleDelete(row)}
            />
          ))}
        </Box>
      )}
    </>
  );
}
