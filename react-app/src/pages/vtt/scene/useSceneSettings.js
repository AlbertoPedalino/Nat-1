import { useCallback, useEffect, useRef } from 'react';
import { updateScene } from '../../../shared/cloud/api/vttScenes.js';
import { sceneBackgrounds, samePlayArea } from '../../../shared/vtt/scene/scene.js';
import { atmosphereFor, withImageAtmosphere } from '../../../shared/vtt/scene/atmosphere.js';
import { imageFilterFor, withImageFilter } from '../../../shared/vtt/scene/imageFilters.js';
import { playAreaForImage } from '../../../shared/vtt/map/geometry.js';

const GRID_SAVE_DELAY = 600;
const ATMOSPHERE_SAVE_DELAY = 400;

// The GM's scene settings that save while being dragged or typed: the grid,
// the play area, and the light filter and atmosphere of each picture. Each is
// shown at once, written after a short pause, and guarded against its own
// echo (beginSceneEdit / noteSceneWrite) so an older row cannot undo it.
export function useSceneSettings({
  scene, onSceneChange, role, spectator, notify, beginSceneEdit, noteSceneWrite, imageSize,
  shownImageForViewport, viewportDisplay, sendDrag,
}) {
  const gridTimerRef = useRef(null);
  const atmosphereTimerRef = useRef(null);
  const imageFilterTimerRef = useRef(null);
  const playAreaTimerRef = useRef(null);
  useEffect(() => () => {
    clearTimeout(gridTimerRef.current);
    clearTimeout(atmosphereTimerRef.current);
    clearTimeout(imageFilterTimerRef.current);
    clearTimeout(playAreaTimerRef.current);
  }, []);

  // Debounced like the grid: dragging a number field should not write a row per
  // keystroke, and this one changes what the players can see.
  const savePlayArea = useCallback((area) => {
    const finishEdit = beginSceneEdit('playArea');
    clearTimeout(playAreaTimerRef.current);
    playAreaTimerRef.current = setTimeout(() => {
      updateScene(scene.id, { playArea: area })
        .then((saved) => {
          noteSceneWrite(saved);
          sendDrag({ tokensChanged: true });
        })
        .catch((cause) => notify('error', cause?.message || 'Could not save the play area.'))
        .finally(finishEdit);
    }, GRID_SAVE_DELAY);
  }, [beginSceneEdit, noteSceneWrite, notify, scene.id, sendDrag]);

  const handleGridChange = useCallback((grid) => {
    const finishEdit = beginSceneEdit('grid');
    // A play area fitted to the picture stays fitted while the grid is being
    // calibrated or switched between squares and hexes. Left behind, it cut a
    // strip off the map the moment the lines moved. A custom area is the GM's
    // own choice and is never touched.
    const fitted = role.isGm && !spectator && shownImageForViewport === 'map' && imageSize
      && samePlayArea(scene.playArea, playAreaForImage(imageSize, scene.grid));
    const playArea = fitted ? playAreaForImage(imageSize, grid) : scene.playArea;
    onSceneChange({ ...scene, grid, playArea });
    if (!samePlayArea(playArea, scene.playArea)) savePlayArea(playArea);
    clearTimeout(gridTimerRef.current);
    gridTimerRef.current = setTimeout(() => {
      updateScene(scene.id, { grid })
        .then(noteSceneWrite)
        .catch((cause) => notify('error', cause?.message || 'Could not save the grid.'))
        .finally(finishEdit);
    }, GRID_SAVE_DELAY);
  }, [beginSceneEdit, imageSize, noteSceneWrite, notify, onSceneChange, role.isGm, savePlayArea, scene, shownImageForViewport, spectator]);

  // The atmosphere of one picture, written like its light filter: the whole
  // map, pruned to the pictures the scene still has.
  const handleAtmosphereChange = useCallback((path, atmosphere) => {
    if (!path) return;
    const next = withImageAtmosphere(
      scene.atmospheres,
      path,
      atmosphere,
      [scene.imagePath, ...sceneBackgrounds(scene)],
    );
    const finishEdit = beginSceneEdit('atmospheres');
    onSceneChange({ ...scene, atmospheres: next });
    clearTimeout(atmosphereTimerRef.current);
    atmosphereTimerRef.current = setTimeout(() => {
      updateScene(scene.id, { atmospheres: next })
        .then(noteSceneWrite)
        .catch((cause) => notify('error', cause?.message || 'Could not save the atmosphere.'))
        .finally(finishEdit);
    }, ATMOSPHERE_SAVE_DELAY);
  }, [beginSceneEdit, noteSceneWrite, notify, onSceneChange, scene]);

  // The light filter of one picture. The whole map is written, pruned to the
  // pictures the scene still has, so a removed background's entry goes with
  // the next change instead of needing a cleanup of its own.
  const handleImageFilterChange = useCallback((path, filter) => {
    if (!path) return;
    const next = withImageFilter(
      scene.imageFilters,
      path,
      filter,
      [scene.imagePath, ...sceneBackgrounds(scene)],
    );
    const finishEdit = beginSceneEdit('imageFilters');
    onSceneChange({ ...scene, imageFilters: next });
    clearTimeout(imageFilterTimerRef.current);
    imageFilterTimerRef.current = setTimeout(() => {
      updateScene(scene.id, { imageFilters: next })
        .then(noteSceneWrite)
        .catch((cause) => notify('error', cause?.message || 'Could not save the light filter.'))
        .finally(finishEdit);
    }, ATMOSPHERE_SAVE_DELAY);
  }, [beginSceneEdit, noteSceneWrite, notify, onSceneChange, scene]);
  // The filter of the picture actually on screen: the one held while the next
  // is decoding keeps its own light until it is replaced.
  const viewportImageFilter = imageFilterFor(scene.imageFilters, viewportDisplay.path);
  const viewportAtmosphere = atmosphereFor(scene.atmospheres, viewportDisplay.path);

  return {
    savePlayArea, handleGridChange, handleAtmosphereChange, handleImageFilterChange,
    viewportImageFilter, viewportAtmosphere,
  };
}
