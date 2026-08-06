import { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { Map, Pencil, Plus, Radio, RadioTower, Trash2 } from 'lucide-react';
import { useToast } from '../../../shared/ToastProvider.jsx';
import { toRoster } from '../../../shared/campaign/roster.js';
import { useGmCampaigns } from '../../../shared/campaign/useGmCampaigns.js';
import {
  clearLiveScene,
  createScene,
  deleteScene,
  listScenes,
  setLiveScene,
  updateScene,
  uploadMapImage,
} from '../../../shared/cloud/vtt.js';
import NewSceneDialog from './NewSceneDialog.jsx';

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
  // Which campaign is having a scene made for it, or null. New scene is a
  // choice now — empty board, or one generated — so it opens a dialog rather
  // than making the empty one on the spot.
  const [creatingFor, setCreatingFor] = useState(null);

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

  // One scene per picture. A floor plan is a map you walk onto, not a layer of
  // one, so a building exported storey by storey becomes a scene per storey and
  // the GM switches between them the way the party climbs.
  //
  // A file that fails takes only its own scene down: the row is removed again so
  // the campaign is not left with an empty "Floor 3" nobody asked for, and the
  // floors that did land stay.
  const handleImport = async (campaignId, entries, onProgress) => {
    const created = [];
    const failed = [];
    let reason = '';
    for (const [index, entry] of entries.entries()) {
      let scene = null;
      try {
        scene = await createScene(campaignId, entry.name);
        const imagePath = await uploadMapImage(campaignId, scene.id, entry.file);
        const updated = await updateScene(scene.id, { imagePath, shownImage: 'map' });
        created.push(updated || scene);
      } catch (cause) {
        failed.push(entry.name);
        // The first one says why; the rest are usually the same story, and a
        // toast per floor is a wall of toast.
        reason = reason || cause?.message || '';
        if (scene) {
          try { await deleteScene(scene.id, campaignId); } catch { /* nothing to undo */ }
        }
      }
      onProgress?.(index + 1);
    }

    await refresh(campaigns.map((campaign) => campaign.id));
    if (failed.length) {
      notify('warning', `Could not import ${failed.join(', ')}.${reason ? ` ${reason}` : ''}`);
    }
    if (created.length) {
      notify('success', created.length === 1
        ? `"${created[0].name}" is ready.`
        : `${created.length} scenes are ready.`);
    } else if (!failed.length) {
      notify('error', 'Nothing was imported.');
    }
    return created;
  };

  // Toggling off ends the session view: the players are left with nothing
  // rather than with whatever scene happened to be open.
  const handleLive = async (scene) => {
    try {
      if (scene.isLive) await clearLiveScene(scene.campaignId);
      else await setLiveScene(scene.id);
      await refresh(campaigns.map((campaign) => campaign.id));
      notify('success', scene.isLive ? 'Players see nothing now.' : `Players are now on "${scene.name}".`);
    } catch (cause) {
      notify('error', cause?.message || 'Could not change the live scene.');
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
      const { cleanupError } = await deleteScene(scene.id, scene.campaignId);
      await refresh(campaigns.map((campaign) => campaign.id));
      if (cleanupError) {
        notify('warning', 'Scene deleted, but some uploaded images could not be cleaned up.');
      }
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
                onClick={() => setCreatingFor(campaign.id)}
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
                      {scene.isLive ? <Chip size="small" color="primary" label="Live" sx={liveChipSx} /> : null}
                      {!scene.imagePath ? (
                        <Typography variant="caption" color="text.secondary">no map yet</Typography>
                      ) : null}
                    </Box>
                    <Tooltip title={scene.isLive ? 'The players are seeing this scene' : 'Show this scene to the players'}>
                      <IconButton
                        size="small"
                        color={scene.isLive ? 'primary' : 'default'}
                        onClick={() => handleLive(scene)}
                      >
                        {scene.isLive ? <Radio size={15} /> : <RadioTower size={15} />}
                      </IconButton>
                    </Tooltip>
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

      <NewSceneDialog
        open={Boolean(creatingFor)}
        campaignId={creatingFor}
        onClose={() => setCreatingFor(null)}
        onCreate={(campaignId) => { setCreatingFor(null); handleCreate(campaignId); }}
        onImport={handleImport}
      />
    </Stack>
  );
}

const emptySx = {
  p: 4,
  bgcolor: 'background.paper',
  textAlign: 'center',
};

const liveChipSx = {
  height: 18,
  fontSize: '0.6rem',
  fontFamily: '"Cinzel", Georgia, serif',
  letterSpacing: '0.06em',
  flexShrink: 0,
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
