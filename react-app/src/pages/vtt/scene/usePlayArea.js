import { useCallback, useEffect, useMemo } from 'react';
import { DEFAULT_FOG_SCALE, fogSizeForImage } from '../../../shared/vtt/map/fog.js';
import { isHexGrid } from '../../../shared/vtt/map/hexGeometry.js';
import { playAreaForImage } from '../../../shared/vtt/map/geometry.js';
import { normalizePlayArea, samePlayArea } from '../../../shared/vtt/scene/scene.js';

// Only used before the map image has loaded, or when the scene has none yet.
const DEFAULT_MAP_CELLS = { cols: 40, rows: 30 };

// How much of the board the map picture covers, and the play area the GM
// fits to it. `fogCells` is the same extent counted in the fog's own cells.
export function usePlayArea({
  scene, onSceneChange, savePlayArea, imageSize, role, spectator, shownImageForViewport,
}) {
  // How many cells the map image covers at the current calibration. Everything
  // sized "to the map" — fog, play area — comes from here.
  // In grid squares: the play area and the "cover everything" check are counted
  // in squares, while the fog itself is counted in its own finer cells.
  const mapCells = useMemo(
    () => (imageSize ? fogSizeForImage(imageSize, scene.grid, 1) : DEFAULT_MAP_CELLS),
    [imageSize, scene.grid],
  );

  const fittedPlayArea = useMemo(() => (
    imageSize
      ? playAreaForImage(imageSize, scene.grid)
      : { x: 0, y: 0, w: DEFAULT_MAP_CELLS.cols, h: DEFAULT_MAP_CELLS.rows }
  ), [imageSize, scene.grid]);

  const fogCells = useMemo(
    () => (imageSize ? fogSizeForImage(imageSize, scene.grid) : {
      cols: DEFAULT_MAP_CELLS.cols * DEFAULT_FOG_SCALE,
      rows: DEFAULT_MAP_CELLS.rows * DEFAULT_FOG_SCALE,
    }),
    [imageSize, scene.grid],
  );

  const handlePlayAreaChange = useCallback((playArea) => {
    const area = normalizePlayArea(playArea);
    onSceneChange({ ...scene, playArea: area });
    savePlayArea(area);
  }, [onSceneChange, savePlayArea, scene]);

  // The map itself is the sensible play area: the GM only ever needs to change
  // it to make room for staging outside the picture.
  const handleFitPlayArea = useCallback(() => {
    handlePlayAreaChange(fittedPlayArea);
  }, [fittedPlayArea, handlePlayAreaChange]);

  // Before hex maps had their own fit calculation they were saved as if their
  // rows were square. Upgrade only that exact old auto-fit shape: a deliberately
  // custom boundary is never rewritten behind the GM's back.
  useEffect(() => {
    if (!role.isGm || spectator || shownImageForViewport !== 'map' || !imageSize || !isHexGrid(scene.grid)) return;
    const current = scene.playArea;
    const legacy = { x: 0, y: 0, w: mapCells.cols, h: mapCells.rows };
    if (samePlayArea(current, legacy) && !samePlayArea(current, fittedPlayArea)) handlePlayAreaChange(fittedPlayArea);
  }, [fittedPlayArea, handlePlayAreaChange, imageSize, mapCells, role.isGm, scene.grid, scene.playArea, shownImageForViewport, spectator]);

  return { fogCells, handlePlayAreaChange, handleFitPlayArea };
}
