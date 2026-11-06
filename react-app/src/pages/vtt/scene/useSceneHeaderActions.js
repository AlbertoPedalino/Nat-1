import { useCallback } from 'react';
import { clearLiveScene, setLiveScene, updateScene } from '../../../shared/cloud/api/vttScenes.js';
import { promptText } from '../../../shared/ui/promptText.js';

// The scene's own row, from the header: going live and renaming.
export function useSceneHeaderActions({ scene, onSceneChange, notify }) {
  const handleToggleLive = useCallback(async () => {
    try {
      if (scene.isLive) {
        await clearLiveScene(scene.campaignId);
        onSceneChange({ ...scene, isLive: false });
      } else {
        onSceneChange(await setLiveScene(scene.id));
      }
    } catch (cause) {
      notify('error', cause?.message || 'Could not change the live scene.');
    }
  }, [notify, onSceneChange, scene]);

  // Scenes get named while they are being played ("the tavern" turns out to be
  // "the ambush"), so the name is editable here and not only from the scene
  // list. Nothing to hide from the players: they never see it.
  const handleRename = useCallback(async () => {
    const next = promptText('Scene name', scene.name);
    if (!next || next === scene.name) return;
    try {
      onSceneChange(await updateScene(scene.id, { name: next }));
    } catch (cause) {
      notify('error', cause?.message || 'Could not rename the scene.');
    }
  }, [notify, onSceneChange, scene.id, scene.name]);

  return { handleToggleLive, handleRename };
}
