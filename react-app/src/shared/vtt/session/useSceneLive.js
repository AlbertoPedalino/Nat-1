import { useCallback, useEffect, useRef } from 'react';
import { useAuth } from '../../cloud/auth/AuthProvider.jsx';
import { supabase } from '../../cloud/supabaseClient.js';
import {
  cameraMessage, normalizeCameraSource, presenterInspectionMessage, presenterStateMessage,
} from './cameraSync.js';
import { coalesceReturns } from '../../cloud/sync/returnGate.js';

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
// A projector following a presenter says so now and then. The presenter only
// streams its camera (up to 20 frames a second while panning) while someone
// is listening — otherwise every pan went to every player for nothing.
const FOLLOWER_EVENT = 'camera-follower';
// Sent by a presenter whose channel (re)subscribed — a GM refresh — so an
// already-open projector answers at once instead of at its next heartbeat.
const FOLLOWER_QUERY_EVENT = 'camera-follower-query';
export const FOLLOWER_HEARTBEAT_MS = 30_000;
export const FOLLOWER_TTL_MS = 75_000;
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
  // True while this presenter has opened a projector itself: stream the camera
  // even before that window has announced itself.
  cameraFollowers = false,
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
  const followerSeenRef = useRef(0);
  const handlers = useRef({});
  handlers.current = {
    onTokenEvent,
    onSceneEvent,
    onRemoteDrag,
    onDrawingEvent,
    onCharacterEvent,
    cameraSourceId,
    cameraFollowers,
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
            followerSeenRef.current = Date.now();
            emitCamera(source, handlers.current.getCameraPose?.());
            emitPresenterState(source, handlers.current.getPresenterState?.());
            emitPresenterInspection(source, handlers.current.getPresenterInspection?.());
          }
        } catch (_) {}
      });

      // The reason lets the caller decide how thorough to be: a reconnect may
      // have missed anything, a periodic tick only needs a version check.
      channel.on('broadcast', { event: FOLLOWER_QUERY_EVENT }, (message) => {
        try {
          const followed = normalizeCameraSource(handlers.current.followCameraSource);
          if (followed && normalizeCameraSource(message?.payload?.source) === followed) {
            channel.send({ type: 'broadcast', event: FOLLOWER_EVENT, payload: { source: followed } });
          }
        } catch (_) {}
      });

      channel.on('broadcast', { event: FOLLOWER_EVENT }, (message) => {
        try {
          const source = normalizeCameraSource(handlers.current.cameraSourceId);
          if (source && normalizeCameraSource(message?.payload?.source) === source) {
            followerSeenRef.current = Date.now();
          }
        } catch (_) {}
      });

      const requestReconcile = (reason) => {
        try {
          Promise.resolve(handlers.current.onReconcile?.({ reason })).catch(() => {});
        } catch (_) {}
      };

      channel.subscribe((state) => {
        if (state !== 'SUBSCRIBED') return;
        // A reconnect resumes future events but does not replay changes missed
        // while the socket was down. Pull the persistent scene snapshot now.
        requestReconcile('subscribed');
        const followedSource = normalizeCameraSource(handlers.current.followCameraSource);
        if (followedSource) {
          channel.send({ type: 'broadcast', event: CAMERA_REQUEST_EVENT, payload: { source: followedSource } });
        }
        // On a GM refresh the projector is already subscribed and therefore
        // cannot send a new handshake. Re-announce this stable presenter source
        // as soon as the replacement channel is ready.
        const presenterSource = normalizeCameraSource(handlers.current.cameraSourceId);
        if (presenterSource) {
          channel.send({ type: 'broadcast', event: FOLLOWER_QUERY_EVENT, payload: { source: presenterSource } });
          emitCamera(presenterSource, handlers.current.getCameraPose?.());
          emitPresenterState(presenterSource, handlers.current.getPresenterState?.());
          emitPresenterInspection(presenterSource, handlers.current.getPresenterInspection?.());
        }
      });
      channelRef.current = channel;

      // Focus and visibilitychange arrive together when a tab comes back: one
      // recovery, not two.
      const reconcileOnReturn = coalesceReturns((reason) => requestReconcile(reason));
      const reconcileWhenVisible = () => {
        if (document.visibilityState === 'visible') reconcileOnReturn('visible');
      };
      const reconcileOnTimer = () => requestReconcile('interval');
      const reconcileOnline = () => requestReconcile('online');
      const reconcileOnFocus = () => reconcileOnReturn('focus');
      const followerTimer = window.setInterval(() => {
        try {
          const followed = normalizeCameraSource(handlers.current.followCameraSource);
          if (followed) channel.send({ type: 'broadcast', event: FOLLOWER_EVENT, payload: { source: followed } });
        } catch (_) {}
      }, FOLLOWER_HEARTBEAT_MS);
      const timer = window.setInterval(reconcileOnTimer, SCENE_RECONCILE_MS);
      window.addEventListener('online', reconcileOnline);
      window.addEventListener('focus', reconcileOnFocus);
      document.addEventListener('visibilitychange', reconcileWhenVisible);

      cleanupReconcile = () => {
        window.clearInterval(timer);
        window.clearInterval(followerTimer);
        window.removeEventListener('online', reconcileOnline);
        window.removeEventListener('focus', reconcileOnFocus);
        document.removeEventListener('visibilitychange', reconcileWhenVisible);
      };
    } catch (_) {
      channelRef.current = null;
      cleanupReconcile();
      // A channel that failed half-way through setup must not linger.
      try {
        if (channel) supabase.removeChannel(channel);
      } catch (__) {}
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
    const listened = handlers.current.cameraFollowers
      || Date.now() - followerSeenRef.current < FOLLOWER_TTL_MS;
    if (!listened) return;
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
