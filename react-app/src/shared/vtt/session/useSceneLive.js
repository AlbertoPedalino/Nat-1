import { useCallback, useEffect, useRef } from 'react';
import { useAuth } from '../../cloud/auth/AuthProvider.jsx';
import { supabase } from '../../cloud/supabaseClient.js';
import { openRealtimeChannel } from '../../cloud/realtimeChannel.js';
import {
  cameraMessage, normalizeCameraSource, presenterInspectionMessage, presenterStateMessage,
} from './cameraSync.js';
import { listenForRecovery, RECOVERY_INTERVAL_MS } from '../../cloud/sync/recoveryTriggers.js';

// One channel per scene carries both streams: committed row changes for tokens,
// strokes and the scene itself, plus ephemeral drag previews. This is the only
// subscription to the current scene's row: which scene is live is
// useLiveSession's question, answered from its own projection table, and the
// characters behind the pieces come from useCampaignRoster's digests.
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
// A follower says it still follows on every recovery heartbeat.
export const FOLLOWER_HEARTBEAT_MS = RECOVERY_INTERVAL_MS;
export const FOLLOWER_TTL_MS = 75_000;
const CAMERA_SEND_MS = 50;

export function useSceneLive({
  sceneId,
  onTokenEvent,
  onSceneEvent,
  onRemoteDrag,
  onDrawingEvent,
  onTurnsEvent,
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
    onTurnsEvent,
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

    // Handlers below send through the channel once it is open; nothing they
    // answer arrives before then.
    let channel = null;
    const send = (event, payload) => channel?.send(event, payload);

    const emitCamera = (source, pose) => {
      const payload = cameraMessage(source, pose);
      if (payload) send(CAMERA_EVENT, payload);
    };

    const emitPresenterState = (source, state) => {
      const payload = presenterStateMessage(source, state);
      if (payload) send(PRESENTER_STATE_EVENT, payload);
    };

    const emitPresenterInspection = (source, inspection) => {
      const payload = presenterInspectionMessage(source, inspection);
      if (payload) send(PRESENTER_INSPECTION_EVENT, payload);
    };

    const followed = () => normalizeCameraSource(handlers.current.followCameraSource);
    const presenter = () => normalizeCameraSource(handlers.current.cameraSourceId);

    const requestReconcile = (reason) => {
      try {
        Promise.resolve(handlers.current.onReconcile?.({ reason })).catch(() => {});
      } catch (_) {}
    };

    channel = openRealtimeChannel(`gb-vtt-${sceneId}`, {
      // Our own drags are already on screen; echoing them back would fight the
      // local pointer.
      config: { broadcast: { self: false } },
      changes: [
        { table: 'map_tokens', filter: `scene_id=eq.${sceneId}`, onChange: (payload) => handlers.current.onTokenEvent?.(payload) },
        { table: 'map_scenes', event: 'UPDATE', filter: `id=eq.${sceneId}`, onChange: (payload) => handlers.current.onSceneEvent?.(payload) },
        { table: 'map_drawings', filter: `scene_id=eq.${sceneId}`, onChange: (payload) => handlers.current.onDrawingEvent?.(payload) },
        // Which fight the scene shows, and its round (20_scene_turns.sql).
        { table: 'map_scene_turns', filter: `scene_id=eq.${sceneId}`, onChange: (payload) => handlers.current.onTurnsEvent?.(payload) },
      ],
      broadcasts: {
        [DRAG_EVENT]: (payload) => handlers.current.onRemoteDrag?.(payload),
        [CAMERA_EVENT]: (message) => {
          const payload = cameraMessage(message?.source, message?.pose);
          if (followed() && payload?.source === followed()) handlers.current.onCameraPose?.(payload.pose);
        },
        [PRESENTER_STATE_EVENT]: (message) => {
          const payload = presenterStateMessage(message?.source, message);
          if (followed() && payload?.source === followed()) handlers.current.onPresenterState?.(payload);
        },
        [PRESENTER_INSPECTION_EVENT]: (message) => {
          const payload = presenterInspectionMessage(message?.source, message);
          if (followed() && payload?.source === followed()) {
            handlers.current.onPresenterInspection?.(
              payload.tokenId ? { tokenId: payload.tokenId, conditionKey: payload.conditionKey } : null,
            );
          }
        },
        // A late-opening projector should not wait for the GM's next pan. It
        // asks the exact source window named in its URL, which replies with the
        // camera pose it already has in memory; nothing about the camera is
        // persisted.
        [CAMERA_REQUEST_EVENT]: (message) => {
          const source = presenter();
          if (source && normalizeCameraSource(message?.source) === source) {
            followerSeenRef.current = Date.now();
            emitCamera(source, handlers.current.getCameraPose?.());
            emitPresenterState(source, handlers.current.getPresenterState?.());
            emitPresenterInspection(source, handlers.current.getPresenterInspection?.());
          }
        },
        [FOLLOWER_QUERY_EVENT]: (message) => {
          const source = followed();
          if (source && normalizeCameraSource(message?.source) === source) send(FOLLOWER_EVENT, { source });
        },
        [FOLLOWER_EVENT]: (message) => {
          const source = presenter();
          if (source && normalizeCameraSource(message?.source) === source) followerSeenRef.current = Date.now();
        },
      },
      onStatus: (state) => {
        if (state !== 'SUBSCRIBED') return;
        // A reconnect resumes future events but does not replay changes missed
        // while the socket was down. Pull the persistent scene snapshot now.
        requestReconcile('subscribed');
        const followedSource = followed();
        if (followedSource) send(CAMERA_REQUEST_EVENT, { source: followedSource });
        // On a GM refresh the projector is already subscribed and therefore
        // cannot send a new handshake. Re-announce this stable presenter source
        // as soon as the replacement channel is ready.
        const presenterSource = presenter();
        if (presenterSource) {
          send(FOLLOWER_QUERY_EVENT, { source: presenterSource });
          emitCamera(presenterSource, handlers.current.getCameraPose?.());
          emitPresenterState(presenterSource, handlers.current.getPresenterState?.());
          emitPresenterInspection(presenterSource, handlers.current.getPresenterInspection?.());
        }
      },
    });
    if (!channel) return undefined;
    channelRef.current = channel;

    // On each recovery heartbeat a follower says it still follows (missed
    // rows are the scene's own watch, useSceneSync). The map keeps following
    // in a background tab (a projector, a second screen), so this runs while
    // hidden too.
    const stopRecovery = listenForRecovery((reason) => {
      if (reason !== 'interval') return;
      const source = followed();
      if (source) send(FOLLOWER_EVENT, { source });
    }, { periodic: true, whenHidden: true });

    return () => {
      stopRecovery();
      channelRef.current = null;
      const cameraState = cameraSendRef.current;
      clearTimeout(cameraState.timer);
      cameraState.timer = null;
      cameraState.pending = null;
      cameraState.last = 0;
      channel.close();
    };
  }, [cloudEnabled, sceneId, status]);

  // Fire-and-forget: a lost drag frame is a cosmetic glitch, and the committed
  // position arrives on drop regardless.
  const sendDrag = useCallback((payload) => {
    channelRef.current?.send(DRAG_EVENT, { ...payload, actor: user?.id || null });
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
      channel.send(CAMERA_EVENT, next);
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
    if (payload) channelRef.current?.send(PRESENTER_STATE_EVENT, payload);
  }, [cameraSourceId]);

  const sendPresenterInspection = useCallback((inspection) => {
    const payload = presenterInspectionMessage(cameraSourceId, inspection);
    if (payload) channelRef.current?.send(PRESENTER_INSPECTION_EVENT, payload);
  }, [cameraSourceId]);

  return { sendDrag, sendCamera, sendPresenterState, sendPresenterInspection };
}
