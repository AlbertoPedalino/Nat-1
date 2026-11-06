import { useCallback } from 'react';
import {
  addSceneBackground,
  removeSceneBackground,
  removeSceneImage,
  replaceSceneImage,
} from '../../../shared/cloud/api/vttScenePictures.js';
import { updateScene } from '../../../shared/cloud/api/vttScenes.js';
import { sceneView, viewPatch } from '../../../shared/vtt/scene/scene.js';

// The scene's pictures: uploading or removing the battlemap and backgrounds,
// and switching what is on show. While the projector is frozen (not
// following), the GM's switch changes only their own view (gmView).
export function useSceneImages({
  scene, onSceneChange, role, notify, setBusy, noteSceneWrite, setGmView,
  projectorFollowingRef, backgroundForViewport,
}) {
  // Every picture change takes the same shape: one cloud call returning the
  // updated row, plus a cleanup that may fail without failing the change.
  const runSceneImageChange = useCallback(async (change, failure) => {
    setBusy(true);
    try {
      const result = await change();
      onSceneChange(result.scene);
      if (result.cleanupError) {
        notify('warning', 'The picture was saved, but an old uploaded file could not be cleaned up.');
      }
      return result;
    } catch (cause) {
      notify('error', cause?.message || failure);
      return null;
    } finally {
      setBusy(false);
    }
  }, [notify, onSceneChange]);

  const handleUploadMap = useCallback(
    (file) => runSceneImageChange(() => replaceSceneImage(scene, file), 'Could not upload that image.'),
    [runSceneImageChange, scene],
  );
  const handleRemoveMap = useCallback(
    () => runSceneImageChange(() => removeSceneImage(scene), 'Could not remove that picture.'),
    [runSceneImageChange, scene],
  );

  // A new background goes on show at once — unless presentation is frozen:
  // then it is the GM's private preparation like any other pick.
  const handleUploadBackground = useCallback(async (file) => {
    const show = projectorFollowingRef.current;
    const result = await runSceneImageChange(
      () => addSceneBackground(scene, file, { show }),
      'Could not upload that image.',
    );
    if (result?.path) setGmView({ shownImage: 'background', backgroundPath: result.path });
  }, [runSceneImageChange, scene]);

  // Without a path: the background currently on this GM's screen.
  const handleRemoveBackground = useCallback((path) => {
    const target = typeof path === 'string' ? path : backgroundForViewport;
    if (!target) return null;
    return runSceneImageChange(
      () => removeSceneBackground(scene, target),
      'Could not remove that picture.',
    );
  }, [backgroundForViewport, runSceneImageChange, scene]);

  // Mode switch and background pick are one move: the GM's view changes, and
  // the row follows unless presentation is frozen.
  const changeView = useCallback(async (next, failure) => {
    setGmView(next);
    // A frozen selection is private preparation. The public scene row remains
    // on its previous picture until the GM explicitly resumes sharing.
    if (role.isGm && !projectorFollowingRef.current) return;
    const patch = viewPatch(sceneView(scene), next);
    if (!Object.keys(patch).length) return;
    onSceneChange({ ...scene, ...patch });
    try {
      noteSceneWrite(await updateScene(scene.id, patch));
    } catch (cause) {
      notify('error', cause?.message || failure);
    }
  }, [noteSceneWrite, notify, onSceneChange, role.isGm, scene]);

  const handleShownImageChange = useCallback(
    (shownImage) => changeView(
      { shownImage, backgroundPath: backgroundForViewport },
      'Could not switch the picture.',
    ),
    [backgroundForViewport, changeView],
  );
  const handleSelectBackground = useCallback(
    (backgroundPath) => changeView(
      { shownImage: 'background', backgroundPath },
      'Could not switch the background.',
    ),
    [changeView],
  );

  return {
    handleUploadMap, handleRemoveMap, handleUploadBackground, handleRemoveBackground,
    handleShownImageChange, handleSelectBackground,
  };
}
