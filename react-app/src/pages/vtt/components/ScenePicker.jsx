import { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { Map, Pencil, Plus, Trash2 } from 'lucide-react';
import { useToast } from '../../../shared/ToastProvider.jsx';
import { toRoster } from '../../../shared/campaign/roster.js';
import { useGmCampaigns } from '../../../shared/campaign/useGmCampaigns.js';
import { createScene, deleteScene, listScenes, updateScene } from '../../../shared/cloud/vtt.js';

// Scenes belong to a campaign, so the picker is grouped by campaign rather than
// being a flat list like the local tools' Library.
export default function ScenePicker({ onOpen }) {
  const { notify } = useToast();
  const { campaigns, loading: loadingCampaigns, error: campaignError } = useGmCampaigns({
    mapRows: async (rows) => toRoster(rows),
  });
  const [scenesByCampaign, setScenesByCampaign] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(async (ids) => {
    if (!ids.length) return;
    try {
      const entries = await Promise.all(ids.map(async (id) => [id, await listScenes(id)]));
      setScenesByCampaign(Object.fromEntries(entries));
      setError('');
    } catch (cause) {
      setError(cause?.message || 'Could not load the scenes.');
    }
  }, []);

  useEffect(() => {
    refresh(campaigns.map((campaign) => campaign.id));
  }, [campaigns, refresh]);

  const handleCreate = async (campaignId) => {
    setBusy(true);
    try {
      const scene = await createScene(campaignId, 'New scene');
      onOpen(scene.id);
    } catch (cause) {
      notify('error', cause?.message || 'Could not create the scene.');
    } finally {
      setBusy(false);
    }
  };

  const handleRename = async (scene) => {
    const next = window.prompt('Scene name', scene.name);
    if (next === null) return;
    try {
      await updateScene(scene.id, { name: next });
      await refresh(campaigns.map((campaign) => campaign.id));
    } catch (cause) {
      notify('error', cause?.message || 'Could not rename the scene.');
    }
  };

  const handleDelete = async (scene) => {
    if (!window.confirm(`Delete "${scene.name}"? Its tokens and fog go with it.`)) return;
    try {
      await deleteScene(scene.id);
      await refresh(campaigns.map((campaign) => campaign.id));
    } catch (cause) {
      notify('error', cause?.message || 'Could not delete the scene.');
    }
  };

  if (loadingCampaigns) return <CircularProgress size={24} />;

  return (
    <Stack spacing={2}>
      {campaignError || error ? (
        <Typography sx={{ color: 'error.main' }}>{campaignError || error}</Typography>
      ) : null}

      {!campaigns.length ? (
        <Paper sx={emptySx}>
          <Typography color="text.secondary">
            Maps belong to a campaign you run. Create one from the Campaigns page first.
          </Typography>
        </Paper>
      ) : null}

      {campaigns.map((campaign) => {
        const scenes = scenesByCampaign[campaign.id] || [];
        return (
          <Paper key={campaign.id} sx={{ p: 2, bgcolor: 'background.paper' }}>
            <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1.5, gap: 1 }}>
              <Box>
                <Typography variant="h2">{campaign.name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {campaign.members.length} character{campaign.members.length === 1 ? '' : 's'} in the campaign
                </Typography>
              </Box>
              <Button
                variant="contained"
                size="small"
                startIcon={<Plus size={15} />}
                disabled={busy}
                onClick={() => handleCreate(campaign.id)}
              >
                New scene
              </Button>
            </Stack>

            {scenes.length ? (
              <Stack spacing={0.75}>
                {scenes.map((scene) => (
                  <Box key={scene.id} sx={rowSx}>
                    <Box component="button" type="button" onClick={() => onOpen(scene.id)} sx={rowButtonSx}>
                      <Map size={16} />
                      <Typography sx={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {scene.name}
                      </Typography>
                      {!scene.imagePath ? (
                        <Typography variant="caption" color="text.secondary">no map yet</Typography>
                      ) : null}
                    </Box>
                    <Tooltip title="Rename">
                      <IconButton size="small" onClick={() => handleRename(scene)}><Pencil size={15} /></IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton size="small" color="error" onClick={() => handleDelete(scene)}>
                        <Trash2 size={15} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                ))}
              </Stack>
            ) : (
              <Typography color="text.secondary" variant="body2">No scenes yet.</Typography>
            )}
          </Paper>
        );
      })}
    </Stack>
  );
}

const emptySx = {
  p: 4,
  bgcolor: 'background.paper',
  textAlign: 'center',
};

const rowSx = {
  display: 'flex',
  alignItems: 'center',
  gap: 0.5,
  p: 0.75,
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 1,
  '&:hover': { borderColor: 'primary.main' },
};

const rowButtonSx = {
  flex: 1,
  minWidth: 0,
  display: 'flex',
  alignItems: 'center',
  gap: 1,
  background: 'none',
  border: 0,
  color: 'inherit',
  font: 'inherit',
  textAlign: 'left',
  cursor: 'pointer',
  p: 0.5,
};
