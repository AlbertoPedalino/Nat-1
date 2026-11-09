import { useCallback } from 'react';
import { updateScene } from '../../../shared/cloud/api/vttScenes.js';
import { sceneBackgrounds, samePlayArea } from '../../../shared/vtt/scene/scene.js';
import { atmosphereFor, withImageAtmosphere } from '../../../shared/vtt/scene/atmosphere.js';
import { imageFilterFor, withImageFilter } from '../../../shared/vtt/scene/imageFilters.js';
import { playAreaForImage } from '../../../shared/vtt/map/geometry.js';
import { failureMessage } from '../../../shared/ui/busyAction.js';
import { useDebouncedCallback } from '../../../shared/ui/useDebouncedCallback.js';

const GRID_SAVE_DELAY = 600;
const ATMOSPHERE_SAVE_DELAY = 400;

// One scene field written after a pause: the caller shows the change at once,
// the row is written once the changes stop (only the last value), and the edit
// is guarded against its own echo (beginSceneEdit / noteSceneWrite) so an older
// row cannot undo it. A pending write is dropped on unmount.
function useDeferredSceneWrite({
  sceneId, beginSceneEdit, noteSceneWrite, notify,
}, field, delay, failure, onSaved) {
  const write = useDebouncedCallback((value, finishEdit) => {
    updateScene(sceneId, { [field]: value })
      .then((saved) => {
        noteSceneWrite(saved);
        onSaved?.(saved);
      })
      .catch((cause) => notify('error', failureMessage(failure, cause)))
      .finally(finishEdit);
  }, delay);
  return useCallback((value) => write(value, beginSceneEdit(field)), [beginSceneEdit, field, write]);
}

// The GM's scene settings that save while being dragged or typed: the grid,
// the play area, and the light filter and atmosphere of each picture.
export function useSceneSettings({
  scene, onSceneChange, role, spectator, notify, beginSceneEdit, noteSceneWrite, imageSize,
  shownImageForViewport, viewportDisplay, sendDrag,
}) {
  const writer = {
    sceneId: scene.id, beginSceneEdit, noteSceneWrite, notify,
  };
  // Debounced like the grid: dragging a number field should not write a row per
  // keystroke, and this one changes what the players can see.
  const savePlayArea = useDeferredSceneWrite(
    writer, 'playArea', GRID_SAVE_DELAY, 'Could not save the play area.', () => sendDrag({ tokensChanged: true }),
  );
  const saveGrid = useDeferredSceneWrite(writer, 'grid', GRID_SAVE_DELAY, 'Could not save the grid.');
  const saveAtmospheres = useDeferredSceneWrite(writer, 'atmospheres', ATMOSPHERE_SAVE_DELAY, 'Could not save the atmosphere.');
  const saveImageFilters = useDeferredSceneWrite(writer, 'imageFilters', ATMOSPHERE_SAVE_DELAY, 'Could not save the light filter.');

  const handleGridChange = useCallback((grid) => {
    // A play area fitted to the picture stays fitted while the grid is being
    // calibrated or switched between squares and hexes. Left behind, it cut a
    // strip off the map the moment the lines moved. A custom area is the GM's
    // own choice and is never touched.
    const fitted = role.isGm && !spectator && shownImageForViewport === 'map' && imageSize
      && samePlayArea(scene.playArea, playAreaForImage(imageSize, scene.grid));
    const playArea = fitted ? playAreaForImage(imageSize, grid) : scene.playArea;
    onSceneChange({ ...scene, grid, playArea });
    if (!samePlayArea(playArea, scene.playArea)) savePlayArea(playArea);
    saveGrid(grid);
  }, [imageSize, onSceneChange, role.isGm, saveGrid, savePlayArea, scene, shownImageForViewport, spectator]);

  // The atmosphere and the light filter of one picture. The whole map is
  // written, pruned to the pictures the scene still has, so a removed
  // background's entry goes with the next change instead of needing a cleanup
  // of its own.
  const handleAtmosphereChange = useCallback((path, atmosphere) => {
    if (!path) return;
    const next = withImageAtmosphere(scene.atmospheres, path, atmosphere, [scene.imagePath, ...sceneBackgrounds(scene)]);
    onSceneChange({ ...scene, atmospheres: next });
    saveAtmospheres(next);
  }, [onSceneChange, saveAtmospheres, scene]);

  const handleImageFilterChange = useCallback((path, filter) => {
    if (!path) return;
    const next = withImageFilter(scene.imageFilters, path, filter, [scene.imagePath, ...sceneBackgrounds(scene)]);
    onSceneChange({ ...scene, imageFilters: next });
    saveImageFilters(next);
  }, [onSceneChange, saveImageFilters, scene]);

  // The filter of the picture actually on screen: the one held while the next
  // is decoding keeps its own light until it is replaced.
  const viewportImageFilter = imageFilterFor(scene.imageFilters, viewportDisplay.path);
  const viewportAtmosphere = atmosphereFor(scene.atmospheres, viewportDisplay.path);

  return {
    savePlayArea, handleGridChange, handleAtmosphereChange, handleImageFilterChange,
    viewportImageFilter, viewportAtmosphere,
  };
}
