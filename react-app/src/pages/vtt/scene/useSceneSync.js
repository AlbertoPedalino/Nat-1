import { useCallback } from 'react';
import { fetchScene, fetchSceneRevision } from '../../../shared/cloud/api/vttScenes.js';
import { applyTokenEvent } from '../../../shared/vtt/session/liveScene.js';
import { toScene } from '../../../shared/vtt/scene/scene.js';
import { useSceneLive } from '../../../shared/vtt/session/useSceneLive.js';
import { useRemotePreviews } from './useRemotePreviews.js';
import { useFogReceiver } from './useFogPainting.js';
import { useSceneWriteGuard } from './useSceneWriteGuard.js';

// Everything that reaches this screen from the rest of the table: committed
// rows over realtime, ephemeral previews over the broadcast channel, and the
// periodic recovery read. Returns the senders and the guards the editing hooks
// write through.
export function useSceneSync({
  scene,
  role,
  roster,
  onSceneChange,
  setTokens,
  draggingRef,
  movingTokenIds,
  refreshVisibleTokens,
  reconcileContent,
  handleDrawingEvent,
  repairImage,
  gmVitals,
  sceneTurns,
  liveOptions,
}) {
  const {
    ghosts, setLasers, laserDots, remoteMeasure, receivePreview, settleTokenGhost,
  } = useRemotePreviews({ role, roster });
  const { paintingRef, receiveFog } = useFogReceiver({ onSceneChange });
  const {
    sceneUpdatedAtRef, beginSceneEdit, noteSceneWrite, acceptsScene,
  } = useSceneWriteGuard({ scene, paintingRef });

  const handleTokenEvent = useCallback((payload) => {
    setTokens((current) => applyTokenEvent(current, payload, {
      draggingId: draggingRef.current,
      pendingIds: movingTokenIds(),
    }));
    settleTokenGhost(payload);
  }, [movingTokenIds, settleTokenGhost]);

  const handleSceneEvent = useCallback((payload) => {
    const next = toScene(payload?.new);
    // The echo of our own debounced write would overwrite the edit or the
    // stroke still in progress.
    if (acceptsScene(next)) onSceneChange(next);
  }, [acceptsScene, onSceneChange]);

  // One channel carries several kinds of ephemeral message, so each is
  // recognised by its own field. The token-drag guard used to run first and
  // dropped everything without an `id` — which is every laser, ruler and fog
  // stroke: they worked locally and were never seen by anyone else.
  const handleRemoteDrag = useCallback((payload) => {
    if (!payload) return;

    // Visibility transitions are deliberately broadcast without a token id.
    // Recipients re-read through RLS after the committed move, so a token that
    // entered or left the play area appears or disappears without disclosing a
    // staged piece through the ephemeral channel.
    if (payload.tokensChanged) {
      refreshVisibleTokens();
      return;
    }

    // Same for a mark the GM hid or showed: realtime never tells a player about
    // a row they may no longer read, so they re-read the marks through RLS.
    if (payload.drawingsChanged) {
      reconcileContent({ fullDrawings: true });
      return;
    }

    if (receiveFog(payload)) return;
    // Rulers, lasers, and otherwise a piece being dragged.
    receivePreview(payload);
  }, [receiveFog, receivePreview, reconcileContent, refreshVisibleTokens]);

  // Runs every 30 seconds on every device at the table, so it asks for
  // versions first and reads a row (the scene with its fog, a piece, a mark, a
  // fight) only when that version moved.
  const reconcilePersistentState = useCallback(async () => {
    repairImage();
    const readSceneIfMoved = async () => {
      const revision = await fetchSceneRevision(scene.id).catch(() => null);
      if (revision === null || revision === sceneUpdatedAtRef.current) return null;
      return fetchScene(scene.id).catch(() => null);
    };
    const [freshScene] = await Promise.all([
      readSceneIfMoved(),
      reconcileContent(),
      gmVitals.reconcile(),
      sceneTurns.reload(),
    ]);
    if (acceptsScene(freshScene)) onSceneChange(freshScene);
  }, [acceptsScene, gmVitals, onSceneChange, reconcileContent, repairImage, scene.id, sceneTurns]);
  const {
    sendDrag, sendCamera, sendPresenterState, sendPresenterInspection,
  } = useSceneLive({
    sceneId: scene.id,
    onTokenEvent: handleTokenEvent,
    onSceneEvent: handleSceneEvent,
    onRemoteDrag: handleRemoteDrag,
    onDrawingEvent: handleDrawingEvent,
    onTurnsEvent: sceneTurns.handleEvent,
    ...liveOptions,
    onReconcile: reconcilePersistentState,
  });

  return {
    ghosts,
    setLasers,
    laserDots,
    remoteMeasure,
    paintingRef,
    beginSceneEdit,
    noteSceneWrite,
    sendDrag,
    sendCamera,
    sendPresenterState,
    sendPresenterInspection,
  };
}
