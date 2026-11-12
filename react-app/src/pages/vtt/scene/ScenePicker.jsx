import { useCallback, useEffect, useState } from 'react';
import { Box, Button, IconButton, Paper, Stack, Tooltip, Typography } from '@mui/material';
import { Map, Pencil, Plus, Radio, RadioTower, Trash2 } from 'lucide-react';
import { useToast } from '../../../shared/ui/ToastProvider.jsx';
import {
  clearLiveScene,
  createScene,
  deleteScene,
  listScenes,
  setLiveScene,
  updateScene,
} from '../../../shared/cloud/api/vttScenes.js';
import { uploadMapImage } from '../../../shared/cloud/api/vttMapImages.js';
import NewSceneDialog from './NewSceneDialog.jsx';
import { confirmAction } from '../../../shared/ui/confirmAction.js';
import { promptText } from '../../../shared/ui/promptText.js';
import { failureMessage, runBusy } from '../../../shared/ui/busyAction.js';
import { LoadingLine } from '../../../shared/ui/LoadStatus.jsx';
import { ICON_SIZES } from '../../../shared/ui/iconSizes.js';
import Panel from '../../../shared/ui/Panel.jsx';
import { GAME_ICONS } from '../../../shared/ui/gameIcons.js';
import { CARD_SX } from '../../../shared/ui/interactive.js';
import { SURFACES } from '../../../shared/ui/surfaces.js';
import TagChip from '../../../shared/ui/TagChip.jsx';
import { UI_COLORS } from '../../../shared/ui/colors.js';

// Scenes belong to a campaign, so the picker is grouped by campaign rather than
// being a flat list like the local tools' Library.
export default function ScenePicker({
  campaigns = [], loadingCampaigns = false, campaignError = null, onOpen,
}) {
  const { notify } = useToast();
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
      setError(failureMessage('Could not load the scenes.', cause));
    }
  }, []);

  useEffect(() => {
    refresh(campaigns.map((campaign) => campaign.id));
  }, [campaigns, refresh]);

  const handleCreate = async (campaignId) => {
    return runBusy({ setBusy, notify }, async () => {
      const scene = await createScene(campaignId, 'New scene');
      onOpen(scene.id);
    }, 'Could not create the scene.');
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
      notify('error', failureMessage('Could not change the live scene.', cause));
    }
  };

  const handleRename = async (scene) => {
    const next = promptText('Scene name', scene.name);
    if (!next || next === scene.name) return;
    try {
      await updateScene(scene.id, { name: next });
      await refresh(campaigns.map((campaign) => campaign.id));
    } catch (cause) {
      notify('error', failureMessage('Could not rename the scene.', cause));
    }
  };

  const handleDelete = async (scene) => {
    if (!confirmAction(`Delete "${scene.name}"? Its tokens and fog go with it.`)) return;
    try {
      const { cleanupError } = await deleteScene(scene.id, scene.campaignId);
      await refresh(campaigns.map((campaign) => campaign.id));
      if (cleanupError) notify('warning', 'Scene deleted, but some uploaded images could not be cleaned up.');
      else notify('success', `Deleted "${scene.name}".`);
    } catch (cause) {
      notify('error', failureMessage('Could not delete the scene.', cause));
    }
  };

  if (loadingCampaigns) return <LoadingLine centered label="Loading campaigns…" />;

  return (
    <Stack spacing={2}>
      {campaignError || error ? (
        <Typography sx={{ color: 'error.main' }}>{campaignError || error}</Typography>
      ) : null}

      {!campaigns.length ? (
        <Paper sx={emptySx}>
          <Typography sx={{ color: 'text.secondary' }}>
            Maps belong to a campaign you run. Create one from the Campaigns page first.
          </Typography>
        </Paper>
      ) : null}

      {campaigns.map((campaign) => {
        const scenes = scenesByCampaign[campaign.id] || [];
        return (
          <Panel
            key={campaign.id}
            icon={GAME_ICONS.scenes}
            title={campaign.name}
            bodySx={{ p: 1.5 }}
            action={(
              <Button
                variant="contained"
                size="small"
                startIcon={<Plus size={ICON_SIZES.sm} />}
                disabled={busy}
                onClick={() => setCreatingFor(campaign.id)}
              >
                New scene
              </Button>
            )}
          >
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.25 }}>
              {campaign.members.length} character{campaign.members.length === 1 ? '' : 's'} in the campaign
            </Typography>

            {scenes.length ? (
              <Stack spacing={0.75}>
                {scenes.map((scene) => (
                  <Box key={scene.id} sx={rowSx}>
                    <Box component="button" type="button" onClick={() => onOpen(scene.id)} sx={rowButtonSx}>
                      <Map size={ICON_SIZES.md} />
                      <Typography sx={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {scene.name}
                      </Typography>
                      {scene.isLive ? <TagChip tone={UI_COLORS.accent} label="Live" /> : null}
                      {!scene.imagePath ? (
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>no map yet</Typography>
                      ) : null}
                    </Box>
                    <Tooltip title={scene.isLive ? 'The players are seeing this scene' : 'Show this scene to the players'}>
                      <IconButton
                        size="small"
                        color={scene.isLive ? 'primary' : 'default'}
                        onClick={() => handleLive(scene)}
                      >
                        {scene.isLive ? <Radio size={ICON_SIZES.sm} /> : <RadioTower size={ICON_SIZES.sm} />}
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Rename">
                      <IconButton size="small" onClick={() => handleRename(scene)}><Pencil size={ICON_SIZES.sm} /></IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton size="small" color="error" onClick={() => handleDelete(scene)}>
                        <Trash2 size={ICON_SIZES.sm} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                ))}
              </Stack>
            ) : (
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>No scenes yet.</Typography>
            )}
          </Panel>
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
  ...SURFACES.panel,
  p: 4,
  textAlign: 'center',
};


// A scene: the drawn card, lit under the cursor.
const rowSx = {
  ...CARD_SX,
  display: 'flex',
  alignItems: 'center',
  gap: 0.5,
  p: 0.75,
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
