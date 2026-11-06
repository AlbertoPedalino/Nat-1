import { useCallback, useRef, useState } from 'react';
import { createPendingWrites } from '../../../shared/cloud/sync/pendingWrites.js';

// Which scene rows from elsewhere (realtime echoes, recovery reads) may replace
// what this screen shows, given the edits and fog strokes it still has on
// their way. `paintingRef` is the fog brush's "stroke in progress" flag.
export function useSceneWriteGuard({ scene, paintingRef }) {
  // The version of the scene row last seen from the server; the recovery poll
  // reads the whole row (fog included) only when the database has moved on.
  const sceneUpdatedAtRef = useRef(scene.updatedAt);
  sceneUpdatedAtRef.current = scene.updatedAt;
  // Scene fields this screen has changed and not finished writing (grid,
  // atmosphere, play area), each with the token of its latest change. One
  // shared flag was cleared by the first write to finish while a later change
  // was still waiting: picking a second atmosphere then let the echo of the
  // first one in, and the screen went new, old, new.
  const [sceneEdits] = useState(createPendingWrites);
  const beginSceneEdit = useCallback((field) => sceneEdits.begin(field), [sceneEdits]);
  // The version of the row our own latest write produced. A local edit never
  // moves `scene.updatedAt`, and the echo of the write is usually turned away
  // while it is still pending, so without this a recovery read that left
  // before the write (and waits on the rest of the reconcile) or the echo of
  // an earlier write came in afterwards and put the old grid or play area
  // back (user report 2026-10-28).
  const savedRevisionRef = useRef({ sceneId: scene.id, updatedAt: 0 });
  const noteSceneWrite = useCallback((saved) => {
    if (!saved?.id || !saved.updatedAt) return;
    const held = savedRevisionRef.current;
    if (held.sceneId !== saved.id || saved.updatedAt > held.updatedAt) {
      savedRevisionRef.current = { sceneId: saved.id, updatedAt: saved.updatedAt };
    }
  }, []);
  // Whether a scene row from elsewhere may replace what this screen shows:
  // not while one of our own edits or a fog stroke is still on its way, and
  // never a version older than the one held or than our own last write.
  const acceptsScene = useCallback((next) => {
    if (!next || sceneEdits.size || paintingRef.current) return false;
    if (!next.updatedAt) return true;
    const saved = savedRevisionRef.current;
    const floor = Math.max(
      sceneUpdatedAtRef.current || 0,
      saved.sceneId === next.id ? saved.updatedAt : 0,
    );
    return next.updatedAt >= floor;
  }, [sceneEdits]);

  return { sceneUpdatedAtRef, beginSceneEdit, noteSceneWrite, acceptsScene };
}
