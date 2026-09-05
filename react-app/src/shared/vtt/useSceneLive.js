import { useCallback, useEffect, useRef } from 'react';
import { useAuth } from '../cloud/AuthProvider.jsx';
import { supabase } from '../cloud/supabaseClient.js';
import {
  cameraMessage, normalizeCameraSource, presenterInspectionMessage, presenterStateMessage,
} from './cameraSync.js';

// One channel per scene carries both streams: committed row changes for tokens
// and the scene itself, plus ephemeral drag previews.
//
// RLS applies to realtime exactly as it does to a query, so a player is never
// sent GM-layer rows here either — the filter is not something this hook has to
// reimplement.

const DRAG_EVENT = 'token-drag';
const CAMERA_EVENT = 'camera-view';
const CAMERA_REQUEST_EVENT = 'camera-request';
const PRESENTER_STATE_EVENT = 'presenter-state';
const PRESENTER_INSPECTION_EVENT = 'presenter-inspection';
const CAMERA_SEND_MS = 50;
const SCENE_RECONCILE_MS = 30_000;

export function useSceneLive({
  sceneId,
  campaignId,
  onTokenEvent,
  onSceneEvent,
  onRemoteDrag,
  onDrawingEvent,
  onCharacterEvent,
  cameraSourceId,
  followCameraSource,
  getCameraPose,
  onCameraPose,
  getPresenterState,
  onPresenterState,
  getPresenterInspection,
  onPresenterInspection,
  onReconcile,
}) {
  const { cloudEnabled, status, user } = useAuth();
  const channelRef = useRef(null);
  const cameraSendRef = useRef({ last: 0, timer: null, pending: null });
  const handlers = useRef({});
  handlers.current = {
    onTokenEvent,
    onSceneEvent,
    onRemoteDrag,
    onDrawingEvent,
    onCharacterEvent,
    cameraSourceId,
    followCameraSource,
    getCameraPose,
    onCameraPose,
    getPresenterState,
    onPresenterState,
    getPresenterInspection,
    onPresenterInspection,
    onReconcile,
  };

  useEffect(() => {
    if (!sceneId || !cloudEnabled || status !== 'authed' || !supabase) return undefined;

    let channel;
    let cleanupReconcile = () => {};
    try {
      channel = supabase.channel(`gb-vtt-${sceneId}`, {
        // Our own drags are already on screen; echoing them back would fight the
        // local pointer.
        config: { broadcast: { self: false } },
      });

      const emitCamera = (source, pose) => {
        const payload = cameraMessage(source, pose);
        if (!payload) return;
        channel.send({ type: 'broadcast', event: CAMERA_EVENT, payload });
      };

      const emitPresenterState = (source, state) => {
        const payload = presenterStateMessage(source, state);
        if (!payload) return;
        channel.send({ type: 'broadcast', event: PRESENTER_STATE_EVENT, payload });
      };

      const emitPresenterInspection = (source, inspection) => {
        const payload = presenterInspectionMessage(source, inspection);
        if (!payload) return;
        channel.send({ type: 'broadcast', event: PRESENTER_INSPECTION_EVENT, payload });
      };

      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'map_tokens', filter: `scene_id=eq.${sceneId}` },
        (payload) => {
          try {
            handlers.current.onTokenEvent?.(payload);
          } catch (_) {
            // Realtime is opportunistic: a bad payload must not break the scene.
          }
        },
      );

      channel.on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'map_scenes', filter: `id=eq.${sceneId}` },
        (payload) => {
          try {
            handlers.current.onSceneEvent?.(payload);
          } catch (_) {}
        },
      );

      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'map_drawings', filter: `scene_id=eq.${sceneId}` },
        (payload) => {
          try {
            handlers.current.onDrawingEvent?.(payload);
          } catch (_) {}
        },
      );

      // Character sheets, scoped to the campaign rather than the scene: damage
      // taken on a sheet has to show on the piece without a reload, and the
      // sheet stays the one place those hit points live.
      if (campaignId) {
        channel.on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'characters', filter: `campaign_id=eq.${campaignId}` },
          (payload) => {
            try {
              handlers.current.onCharacterEvent?.(payload);
            } catch (_) {}
          },
        );
      }

      channel.on('broadcast', { event: DRAG_EVENT }, (message) => {
        try {
          handlers.current.onRemoteDrag?.(message?.payload || null);
        } catch (_) {}
      });

      channel.on('broadcast', { event: CAMERA_EVENT }, (message) => {
        try {
          const expected = normalizeCameraSource(handlers.current.followCameraSource);
          const payload = cameraMessage(message?.payload?.source, message?.payload?.pose);
          if (expected && payload?.source === expected) handlers.current.onCameraPose?.(payload.pose);
        } catch (_) {}
      });

      channel.on('broadcast', { event: PRESENTER_STATE_EVENT }, (message) => {
        try {
          const expected = normalizeCameraSource(handlers.current.followCameraSource);
          const payload = presenterStateMessage(message?.payload?.source, message?.payload);
          if (expected && payload?.source === expected) handlers.current.onPresenterState?.(payload);
        } catch (_) {}
      });

      channel.on('broadcast', { event: PRESENTER_INSPECTION_EVENT }, (message) => {
        try {
          const expected = normalizeCameraSource(handlers.current.followCameraSource);
          const payload = presenterInspectionMessage(message?.payload?.source, message?.payload);
          if (expected && payload?.source === expected) {
            handlers.current.onPresenterInspection?.(
              payload.tokenId ? { tokenId: payload.tokenId, conditionKey: payload.conditionKey } : null,
            );
          }
        } catch (_) {}
      });

      // A late-opening projector should not wait for the GM's next pan. It asks
      // the exact source window named in its URL, which replies with the camera
      // pose it already has in memory; nothing about the camera is persisted.
      channel.on('broadcast', { event: CAMERA_REQUEST_EVENT }, (message) => {
        try {
          const source = normalizeCameraSource(handlers.current.cameraSourceId);
          const requested = normalizeCameraSource(message?.payload?.source);
          if (source && requested === source) {
            emitCamera(source, handlers.current.getCameraPose?.());
            emitPresenterState(source, handlers.current.getPresenterState?.());
            emitPresenterInspection(source, handlers.current.getPresenterInspection?.());
          }
        } catch (_) {}
      });

      const requestReconcile = () => {
        try {
          Promise.resolve(handlers.current.onReconcile?.()).catch(() => {});
        } catch (_) {}
      };

      channel.subscribe((state) => {
        if (state !== 'SUBSCRIBED') return;
        // A reconnect resumes future events but does not replay changes missed
        // while the socket was down. Pull the persistent scene snapshot now.
        requestReconcile();
        const followedSource = normalizeCameraSource(handlers.current.followCameraSource);
        if (followedSource) {
          channel.send({ type: 'broadcast', event: CAMERA_REQUEST_EVENT, payload: { source: followedSource } });
        }
        // On a GM refresh the projector is already subscribed and therefore
        // cannot send a new handshake. Re-announce this stable presenter source
        // as soon as the replacement channel is ready.
        const presenterSource = normalizeCameraSource(handlers.current.cameraSourceId);
        if (presenterSource) {
          emitCamera(presenterSource, handlers.current.getCameraPose?.());
          emitPresenterState(presenterSource, handlers.current.getPresenterState?.());
          emitPresenterInspection(presenterSource, handlers.current.getPresenterInspection?.());
        }
      });
      channelRef.current = channel;

      const reconcileWhenVisible = () => {
        if (document.visibilityState === 'visible') requestReconcile();
      };
      const timer = window.setInterval(requestReconcile, SCENE_RECONCILE_MS);
      window.addEventListener('online', requestReconcile);
      window.addEventListener('focus', requestReconcile);
      document.addEventListener('visibilitychange', reconcileWhenVisible);

      cleanupReconcile = () => {
        window.clearInterval(timer);
        window.removeEventListener('online', requestReconcile);
        window.removeEventListener('focus', requestReconcile);
        document.removeEventListener('visibilitychange', reconcileWhenVisible);
      };
    } catch (_) {
      channelRef.current = null;
      return undefined;
    }

    return () => {
      cleanupReconcile();
      channelRef.current = null;
      const cameraState = cameraSendRef.current;
      clearTimeout(cameraState.timer);
      cameraState.timer = null;
      cameraState.pending = null;
      cameraState.last = 0;
      try {
        supabase.removeChannel(channel);
      } catch (_) {
        // Already closed.
      }
    };
  }, [campaignId, cloudEnabled, sceneId, status]);

  // Fire-and-forget: a lost drag frame is a cosmetic glitch, and the committed
  // position arrives on drop regardless.
  const sendDrag = useCallback((payload) => {
    const channel = channelRef.current;
    if (!channel) return;
    try {
      channel.send({
        type: 'broadcast',
        event: DRAG_EVENT,
        payload: { ...payload, actor: user?.id || null },
      });
    } catch (_) {}
  }, [user?.id]);

  const sendCamera = useCallback((pose) => {
    const payload = cameraMessage(cameraSourceId, pose);
    if (!payload) return;
    const state = cameraSendRef.current;
    const transmit = (next) => {
      const channel = channelRef.current;
      if (!channel || !next) return;
      state.last = Date.now();
      channel.send({ type: 'broadcast', event: CAMERA_EVENT, payload: next });
    };
    const elapsed = Date.now() - state.last;
    if (elapsed >= CAMERA_SEND_MS) {
      clearTimeout(state.timer);
      state.timer = null;
      state.pending = null;
      transmit(payload);
      return;
    }
    state.pending = payload;
    if (state.timer) return;
    state.timer = setTimeout(() => {
      state.timer = null;
      const pending = state.pending;
      state.pending = null;
      transmit(pending);
    }, CAMERA_SEND_MS - elapsed);
  }, [cameraSourceId]);

  const sendPresenterState = useCallback((state) => {
    const payload = presenterStateMessage(cameraSourceId, state);
    const channel = channelRef.current;
    if (!payload || !channel) return;
    try {
      channel.send({ type: 'broadcast', event: PRESENTER_STATE_EVENT, payload });
    } catch (_) {}
  }, [cameraSourceId]);

  const sendPresenterInspection = useCallback((inspection) => {
    const payload = presenterInspectionMessage(cameraSourceId, inspection);
    const channel = channelRef.current;
    if (!payload || !channel) return;
    try {
      channel.send({ type: 'broadcast', event: PRESENTER_INSPECTION_EVENT, payload });
    } catch (_) {}
  }, [cameraSourceId]);

  return { sendDrag, sendCamera, sendPresenterState, sendPresenterInspection };
}
