import { useCallback, useEffect, useRef, useState } from 'react';
import { updateScene } from '../../../shared/cloud/api/vtt.js';
import { sceneView, viewBackgroundPath, viewPatch } from '../../../shared/vtt/scene/scene.js';
import { createCameraSourceId } from '../../../shared/vtt/session/cameraSync.js';
import { shouldApplyPresenterFrame, spectatorUrl } from '../../../shared/vtt/session/spectator.js';
import { createProjectorLink, isWindowOpen } from '../../../shared/vtt/session/projectorLink.js';

// How long an open projector in this browser has to say it is there.
const PROJECTOR_ANSWER_MS = 400;

// The projector's side of a scene, as far as it can be known before the
// realtime channel exists: which camera the GM presents, whether the projector
// follows it, which picture each of them shows, and whether this GM window has
// a projector running. `liveOptions` is what useSceneLive needs from it; the
// controls that send on the channel are useProjectorControls.
export function useProjectorFollow({
  scene,
  role,
  spectator,
  spectatorSource,
  cameraSourceId,
  presenterFollowingRef,
  presenterWindowRef,
}) {
  const fallbackCameraSourceRef = useRef(createCameraSourceId());
  const presenterCameraSource = cameraSourceId || fallbackCameraSourceRef.current;
  const cameraPoseRef = useRef(null);
  const frozenCameraPoseRef = useRef(null);
  const [followCameraPose, setFollowCameraPose] = useState(null);
  const localProjectorFollowingRef = useRef(true);
  const projectorFollowingRef = presenterFollowingRef || localProjectorFollowingRef;
  const [projectorFollowing, setProjectorFollowing] = useState(projectorFollowingRef.current);
  // Whether this GM window has a projector running. The window handle belongs
  // to the VTT page, so it outlives this editor (back to Tables, another
  // scene); after a reload, when no handle is left, the projector itself says
  // it is there (projectorLink.js). Either way "Projector mode" is not offered
  // twice, which is what used to open a second projector.
  const localProjectorWindowRef = useRef(null);
  const projectorWindowRef = presenterWindowRef || localProjectorWindowRef;
  const projectorLinkRef = useRef(null);
  const [projectorAttached, setProjectorAttached] = useState(() => isWindowOpen(projectorWindowRef.current));
  // A scene that is not live has no projector to point anywhere; the projector
  // stays attached and the controls return with the live scene.
  const projectorControlsOpen = projectorAttached && scene.isLive;
  const hasPresenterFrameRef = useRef(false);
  // A view is the mode plus, in background mode, which background.
  const [projectorView, setProjectorView] = useState(() => sceneView(scene));
  // The database value is the picture published to players. While presentation
  // is frozen the GM gets a private selection here, so they can prepare the
  // other picture without moving either players or the projector to it.
  const [gmView, setGmView] = useState(() => sceneView(scene));
  const sceneViewRef = useRef(sceneView(scene));
  sceneViewRef.current = sceneView(scene);
  const presenterInspectionRef = useRef(null);
  const [projectorInspection, setProjectorInspection] = useState(null);

  // Asked on arrival and whenever this window comes back to the front, which is
  // exactly when a projector closed by hand was closed: it must not leave "Stop
  // projector mode" offering to close a window that is already gone. An open
  // handle or an answer keeps the projector attached; with neither, it is
  // taken as closed.
  useEffect(() => {
    if (!role.isGm || spectator) return undefined;
    let answered = false;
    let timer = null;
    const link = createProjectorLink(presenterCameraSource, {
      here: () => {
        answered = true;
        setProjectorAttached(true);
      },
      gone: () => ask(),
    });
    projectorLinkRef.current = link;
    function ask() {
      answered = false;
      link?.send('who');
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (answered || isWindowOpen(projectorWindowRef.current)) return;
        projectorWindowRef.current = null;
        setProjectorAttached(false);
      }, PROJECTOR_ANSWER_MS);
    }
    ask();
    window.addEventListener('focus', ask);
    return () => {
      window.removeEventListener('focus', ask);
      clearTimeout(timer);
      projectorLinkRef.current = null;
      link?.close();
    };
  }, [presenterCameraSource, projectorWindowRef, role.isGm, spectator]);


  useEffect(() => {
    // A live-scene switch always wins over a paused camera: enter the new scene
    // on its current picture, accept one fresh presenter snapshot, then remain
    // paused if that is still the GM's chosen mode.
    setProjectorView(sceneView(scene));
    setGmView(sceneView(scene));
    setFollowCameraPose(null);
    hasPresenterFrameRef.current = false;
    presenterInspectionRef.current = null;
    setProjectorInspection(null);
  }, [scene.id]);

  useEffect(() => {
    if (spectator && projectorFollowing) {
      setProjectorView({ shownImage: scene.shownImage, backgroundPath: scene.backgroundPath || null });
    }
  }, [projectorFollowing, scene.backgroundPath, scene.shownImage, spectator]);

  useEffect(() => {
    if (role.isGm && projectorFollowingRef.current) {
      setGmView({ shownImage: scene.shownImage, backgroundPath: scene.backgroundPath || null });
    }
  }, [role.isGm, scene.backgroundPath, scene.shownImage]);

  const getCameraPose = useCallback(() => cameraPoseRef.current, []);
  const getPresenterState = useCallback(() => ({
    following: projectorFollowingRef.current,
    shownImage: sceneViewRef.current.shownImage,
    backgroundPath: sceneViewRef.current.backgroundPath,
    pose: projectorFollowingRef.current ? cameraPoseRef.current : frozenCameraPoseRef.current,
  }), []);
  const getPresenterInspection = useCallback(() => presenterInspectionRef.current, []);
  const handleRemoteCameraPose = useCallback((pose) => {
    if (projectorFollowingRef.current) setFollowCameraPose(pose);
  }, []);
  const handleRemotePresenterState = useCallback((next) => {
    const wasFollowing = projectorFollowingRef.current;
    // The first paused frame is the snapshot to freeze. Further paused frames
    // are deliberately ignored until the presenter reconnects the projector.
    if (!hasPresenterFrameRef.current || shouldApplyPresenterFrame(wasFollowing, next.following)) {
      if (next.pose) setFollowCameraPose(next.pose);
      setProjectorView({ shownImage: next.shownImage, backgroundPath: next.backgroundPath || null });
    }
    hasPresenterFrameRef.current = true;
    projectorFollowingRef.current = next.following;
    setProjectorFollowing(next.following);
  }, []);
  const handleRemotePresenterInspection = useCallback((inspection) => {
    setProjectorInspection(inspection);
  }, []);

  return {
    presenterCameraSource,
    cameraPoseRef,
    frozenCameraPoseRef,
    followCameraPose,
    projectorFollowingRef,
    projectorFollowing,
    setProjectorFollowing,
    projectorWindowRef,
    projectorLinkRef,
    projectorAttached,
    setProjectorAttached,
    projectorControlsOpen,
    projectorView,
    gmView,
    setGmView,
    presenterInspectionRef,
    projectorInspection,
    liveOptions: {
      cameraSourceId: role.isGm && !spectator ? presenterCameraSource : null,
      cameraFollowers: projectorControlsOpen,
      followCameraSource: spectator ? spectatorSource : null,
      getCameraPose,
      onCameraPose: spectator ? handleRemoteCameraPose : undefined,
      getPresenterState,
      onPresenterState: spectator ? handleRemotePresenterState : undefined,
      getPresenterInspection,
      onPresenterInspection: spectator ? handleRemotePresenterInspection : undefined,
    },
  };
}

// The GM's projector controls, which send on the scene channel: the camera and
// the inspected piece it streams, freezing and resuming the projector, and
// opening or closing the projector window.
export function useProjectorControls({
  projector,
  scene,
  role,
  spectator,
  onSceneChange,
  notify,
  noteSceneWrite,
  sendCamera,
  sendPresenterState,
  sendPresenterInspection,
}) {
  const {
    presenterCameraSource, cameraPoseRef, frozenCameraPoseRef, projectorFollowingRef,
    setProjectorFollowing, projectorWindowRef, projectorLinkRef, setProjectorAttached, gmView,
    presenterInspectionRef,
  } = projector;

  const handleTokenInspection = useCallback((inspection) => {
    presenterInspectionRef.current = inspection;
    sendPresenterInspection(inspection);
  }, [sendPresenterInspection]);

  const handleCameraViewChange = useCallback((pose) => {
    cameraPoseRef.current = pose;
    sendCamera(pose);
  }, [sendCamera]);

  const handleToggleProjectorFollow = useCallback(async () => {
    const following = !projectorFollowingRef.current;
    const published = sceneView(scene);
    // The prepared background is resolved against the list first: one removed
    // while frozen must not be published as a dangling path.
    const prepared = { shownImage: gmView.shownImage, backgroundPath: viewBackgroundPath(scene, gmView) };
    const view = following ? prepared : published;
    // Unfreezing publishes the picture the GM prepared. Freezing leaves the
    // persisted picture untouched, which also gives late-joining players the
    // same frozen frame as everyone already connected.
    const patch = following ? viewPatch(published, view) : {};
    if (Object.keys(patch).length) {
      try {
        noteSceneWrite(await updateScene(scene.id, patch));
        onSceneChange({ ...scene, ...patch });
      } catch (cause) {
        notify('error', cause?.message || 'Could not share the prepared view.');
        return;
      }
    }
    frozenCameraPoseRef.current = following ? null : cameraPoseRef.current;
    projectorFollowingRef.current = following;
    setProjectorFollowing(following);
    sendPresenterState({
      following,
      shownImage: view.shownImage,
      backgroundPath: view.backgroundPath,
      pose: following ? cameraPoseRef.current : frozenCameraPoseRef.current,
    });
  }, [gmView, noteSceneWrite, notify, onSceneChange, scene, sendPresenterState]);

  // Switching Map/Background is presenter state as well as persisted scene
  // state. Broadcasting it keeps ordering deterministic relative to a freeze.
  useEffect(() => {
    if (!role.isGm || spectator) return;
    sendPresenterState({
      following: projectorFollowingRef.current,
      shownImage: scene.shownImage,
      backgroundPath: scene.backgroundPath || null,
      pose: cameraPoseRef.current,
    });
  }, [role.isGm, scene.backgroundPath, scene.shownImage, sendPresenterState, spectator]);

  // The GM sets the projector up once, drags it onto the television, and goes
  // back to running the game: being thrown into it every time is the wrong way
  // round.
  //
  // A window, not a tab, and that is the whole trick. Browsers refuse to move
  // the focus between tabs from script — the opener cannot keep it, the new tab
  // cannot hand it back, and a synthesized modifier-click is not honoured
  // either. Between windows they still allow it, so the projector raises the
  // GM's window again on arrival (see VttPage). A separate window is also what
  // the second screen wants: it can be dragged there and left fullscreen.
  //
  // Opening by script — and therefore without `noopener` — is also what makes
  // the handle available, which is what lets "Stop" close it again.
  const openSpectator = useCallback(() => {
    const url = spectatorUrl(window.location.href, scene.campaignId, presenterCameraSource);
    const width = Math.min(1280, Math.max(640, window.screen?.availWidth || 1280));
    const height = Math.min(800, Math.max(480, window.screen?.availHeight || 800));
    const projector = window.open(
      url,
      'gmboard-projector',
      `popup=yes,width=${Math.round(width * 0.8)},height=${Math.round(height * 0.8)}`,
    );
    if (!projector) {
      notify('warning', 'The projector window was blocked. Allow pop-ups for this site.');
      return;
    }
    projectorWindowRef.current = projector;
    setProjectorAttached(true);
  }, [notify, presenterCameraSource, projectorWindowRef, scene.campaignId]);

  // By handle where there is one, and by asking it to close itself for a
  // projector this window no longer holds a handle to.
  const stopProjector = useCallback(() => {
    setProjectorAttached(false);
    const projector = projectorWindowRef.current;
    projectorWindowRef.current = null;
    try { projector?.close(); } catch (_) {}
    projectorLinkRef.current?.send('close');
  }, [projectorWindowRef]);

  return {
    handleTokenInspection,
    handleCameraViewChange,
    handleToggleProjectorFollow,
    openSpectator,
    stopProjector,
  };
}
