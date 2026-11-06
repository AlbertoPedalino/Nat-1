import { useCallback, useRef } from 'react';
import { updateScene } from '../../../shared/cloud/api/vttScenes.js';
import {
  applyCells,
  applyFogDelta,
  createFog,
  fogDelta,
  hideAll,
  normalizeFog,
  revealAll,
  sameFog,
} from '../../../shared/vtt/map/fog.js';
import { acceptFogDelta, newFogStroke } from '../../../shared/vtt/map/fogStream.js';

const FOG_BROADCAST_MS = 80;

// The receiving side of fog painting, needed before the scene channel exists:
// whether this screen is mid-stroke (`paintingRef`, which also holds back
// scene rows from elsewhere) and `receiveFog`, which applies another painter's
// frames and answers whether the broadcast was a fog message at all.
export function useFogReceiver({ onSceneChange }) {
  const paintingRef = useRef(false);
  // Where each remote painter's stroke has got to.
  const remoteFogStreamsRef = useRef(new Map());

  const receiveFog = useCallback((payload) => {
    // A live painting frame: only the cells it flipped. Applied in order; a
    // gap waits for the stroke's final snapshot instead of guessing.
    if (payload.fogDelta) {
      if (paintingRef.current) return true;
      if (!acceptFogDelta(remoteFogStreamsRef.current, payload.actor, payload.fogDelta)) return true;
      onSceneChange((current) => {
        const fog = applyFogDelta(current.fog, payload.fogDelta);
        return fog && fog !== current.fog ? { ...current, fog } : current;
      });
      return true;
    }

    // Fog strokes carry a bitset, not a position.
    if (payload.fog) {
      if (!paintingRef.current) onSceneChange((current) => ({ ...current, fog: normalizeFog(payload.fog) }));
      return true;
    }
    return false;
  }, [onSceneChange]);

  return { paintingRef, receiveFog };
}

// The GM's fog brush and the fog-wide commands (enable, cover, reveal all).
//
// Painting mirrors the token drag: every stroke frame goes out on broadcast,
// and the database sees one write when the brush lifts.
//
// The next fog is worked out from `fogRef` before any state is set: state
// updaters stay pure (React may run them twice), and a stroke over cells
// already in the wanted state sends and stores nothing at all.
//
// Live frames carry only the cells flipped since the previous frame, not the
// whole bitset; the full fog goes out once, when the brush lifts.
export function useFogPainting({
  scene, onSceneChange, paintingRef, fogCells, sendDrag, noteSceneWrite, notify, setPaintMode,
}) {
  const fogBroadcastRef = useRef(0);
  // The fog the brush works on. It follows the scene between strokes; during
  // one it runs ahead of the render, so consecutive pointer moves build on
  // each other without reading state inside an updater.
  const fogRef = useRef(scene.fog);
  if (!paintingRef.current) fogRef.current = scene.fog;
  const fogStrokeDirtyRef = useRef(false);
  // Cells flipped since the last live frame went out, and the numbering of
  // this stroke's frames (fogStream.js).
  const fogDeltaRef = useRef({ stroke: null, seq: 0, on: [], off: [] });

  const handlePaint = useCallback((cells, revealed) => {
    if (!paintingRef.current) {
      fogDeltaRef.current = { stroke: newFogStroke(), seq: 0, on: [], off: [] };
    }
    paintingRef.current = true;
    const { fog, changed } = applyCells(fogRef.current, cells, revealed);
    if (!fog || !changed.length) return;
    fogRef.current = fog;
    fogStrokeDirtyRef.current = true;
    onSceneChange((current) => ({ ...current, fog }));
    const pending = fogDeltaRef.current;
    (revealed ? pending.on : pending.off).push(...changed);
    const now = Date.now();
    if (now - fogBroadcastRef.current >= FOG_BROADCAST_MS) {
      fogBroadcastRef.current = now;
      const fogDeltaFrame = { stroke: pending.stroke, seq: pending.seq, ...fogDelta(fog, pending.on, pending.off) };
      pending.seq += 1;
      pending.on = [];
      pending.off = [];
      sendDrag({ fogDelta: fogDeltaFrame });
    }
  }, [onSceneChange, sendDrag]);

  const commitFog = useCallback((fog) => {
    paintingRef.current = false;
    // The snapshot below carries every cell; frames still pending are moot.
    fogDeltaRef.current = { stroke: null, seq: 0, on: [], off: [] };
    sendDrag({ fog });
    updateScene(scene.id, { fog }).then(noteSceneWrite).catch((cause) => {
      notify('error', cause?.message || 'Could not save the fog.');
    });
  }, [noteSceneWrite, notify, scene.id, sendDrag]);

  const handlePaintEnd = useCallback(() => {
    paintingRef.current = false;
    if (!fogStrokeDirtyRef.current) return;
    fogStrokeDirtyRef.current = false;
    commitFog(fogRef.current);
  }, [commitFog]);

  // Sized from the map, not from a constant: a fixed grid left the far side of
  // a large image permanently uncovered, which is worse than no fog at all.
  const handleEnableFog = useCallback(() => {
    const { cols, rows } = fogCells;
    const fog = createFog(cols, rows);
    fogRef.current = fog;
    onSceneChange({ ...scene, fog });
    setPaintMode('reveal');
    commitFog(fog);
  }, [commitFog, fogCells, onSceneChange, scene]);

  const handleFogAll = useCallback((revealed) => {
    const current = fogRef.current;
    // Covering everything means everything: if the map grew, or the grid was
    // recalibrated finer, the old fog no longer reaches the edges and is
    // rebuilt at the current size rather than leaving a bright margin.
    const tooSmall = current
      && (current.cols < fogCells.cols || current.rows < fogCells.rows);
    const fog = revealed
      ? revealAll(current)
      : (tooSmall ? createFog(fogCells.cols, fogCells.rows) : hideAll(current));
    if (!fog || sameFog(fog, current)) return;
    fogRef.current = fog;
    onSceneChange((scene) => ({ ...scene, fog }));
    commitFog(fog);
  }, [commitFog, fogCells, onSceneChange]);

  return { handlePaint, handlePaintEnd, handleEnableFog, handleFogAll };
}
