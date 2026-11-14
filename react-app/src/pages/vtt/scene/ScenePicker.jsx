import { useCallback, useEffect, useState } from 'react';
import { Box, Stack } from '@mui/material';
import { Map, Pencil, Radio, RadioTower, Trash2 } from 'lucide-react';
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
import { ICON_SIZES } from '../../../shared/ui/iconSizes.js';
import PageHeader from '../../../shared/ui/PageHeader.jsx';
import ListFilterBar from '../../../shared/ui/ListFilterBar.jsx';
import { useListFilter } from '../../../shared/ui/useListFilter.js';
import { TOOL_CATALOG } from '../../../app/navigation/toolCatalog.js';
import EntityRow from '../../../shared/ui/EntityRow.jsx';
import { LiveTag } from '../../../shared/ui/TagChip.jsx';
import StatePanel from '../../../shared/ui/StatePanel.jsx';
import { ErrorLine } from '../../../shared/ui/LoadStatus.jsx';
import TipIconButton from '../../../shared/ui/TipIconButton.jsx';
import AddButton from '../../../shared/ui/AddButton.jsx';

const sceneText = (scene) => scene.name;

// The battle map's second step, for a campaign the user runs (`campaign`:
// { id, name, members }): its scenes, searched by name, and New scene. Scenes
// belong to a campaign, so the GM picks the campaign first (CampaignTablePicker).
export default function ScenePicker({
  campaign = null, campaignError = null, onOpen,
}) {
  const { notify } = useToast();
  const campaignId = campaign?.id || '';
  const [scenes, setScenes] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  // Whether a scene is being made. New scene is a choice — empty board, or one
  // generated — so it opens a dialog rather than making the empty one on the
  // spot.
  const [creating, setCreating] = useState(false);
  const filter = useListFilter(scenes, { getText: sceneText });

  const refresh = useCallback(async () => {
    if (!campaignId) return;
    try {
      setScenes(await listScenes(campaignId));
      setError('');
    } catch (cause) {
      setError(failureMessage('Could not load the scenes.', cause));
    }
  }, [campaignId]);

  useEffect(() => { refresh(); }, [refresh]);

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

    await refresh();
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
      await refresh();
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
      await refresh();
    } catch (cause) {
      notify('error', failureMessage('Could not rename the scene.', cause));
    }
  };

  const handleDelete = async (scene) => {
    if (!confirmAction(`Delete "${scene.name}"? Its tokens and fog go with it.`)) return;
    try {
      const { cleanupError } = await deleteScene(scene.id, scene.campaignId);
      await refresh();
      if (cleanupError) notify('warning', 'Scene deleted, but some uploaded images could not be cleaned up.');
      else notify('success', `Deleted "${scene.name}".`);
    } catch (cause) {
      notify('error', failureMessage('Could not delete the scene.', cause));
    }
  };

  // The campaigns failed to load: say so, not that this one is not the user's.
  if (!campaign && campaignError) return <ErrorLine>{campaignError}</ErrorLine>;

  if (!campaign) {
    return (
      <StatePanel title="Not a campaign you run">
        Scenes are made by the campaign's GM. Pick one of your tables from the Battle Map.
      </StatePanel>
    );
  }

  return (
    <Stack spacing={1.5}>
      <PageHeader
        tool={TOOL_CATALOG.vtt}
        title={campaign.name}
        subtitle={`${campaign.members.length} character${campaign.members.length === 1 ? '' : 's'} in the campaign`}
        actions={(
          <AddButton main disabled={busy} onClick={() => setCreating(true)}>
            New scene
          </AddButton>
        )}
        sx={{ mb: 0 }}
      />

      {campaignError || error ? (
        <ErrorLine>{campaignError || error}</ErrorLine>
      ) : null}

      {scenes.length ? (
        <Box>
          <ListFilterBar filter={filter} what="scenes" />
          <Stack spacing={0.75}>
            {filter.visible.map((scene) => (
              <EntityRow
                key={scene.id}
                surface="card"
                onClick={() => onOpen(scene.id)}
                leading={<Map size={ICON_SIZES.md} />}
                title={scene.name}
                badge={scene.isLive ? <LiveTag component="span" /> : null}
                meta={scene.imagePath ? null : 'no map yet'}
                actions={(
                  <>
                    <TipIconButton title={scene.isLive ? 'The players are seeing this scene' : 'Show this scene to the players'} size="small" color={scene.isLive ? 'primary' : 'default'} onClick={() => handleLive(scene)}>
                      {scene.isLive ? <Radio size={ICON_SIZES.sm} /> : <RadioTower size={ICON_SIZES.sm} />}
                    </TipIconButton>
                    <TipIconButton title="Rename" size="small" onClick={() => handleRename(scene)}><Pencil size={ICON_SIZES.sm} /></TipIconButton>
                    <TipIconButton title="Delete" size="small" danger onClick={() => handleDelete(scene)}>
                      <Trash2 size={ICON_SIZES.sm} />
                    </TipIconButton>
                  </>
                )}
              />
            ))}
          </Stack>
        </Box>
      ) : (
        <StatePanel title="No scenes yet">Make the first one with New scene.</StatePanel>
      )}

      <NewSceneDialog
        open={creating}
        campaignId={campaignId}
        onClose={() => setCreating(false)}
        onCreate={(id) => { setCreating(false); handleCreate(id); }}
        onImport={handleImport}
      />
    </Stack>
  );
}
