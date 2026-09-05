import {
  lazy, memo, Suspense, useCallback, useEffect, useMemo, useRef, useState, useTransition,
} from 'react';
import {
  Box, Button, CircularProgress, IconButton, Stack, Tooltip, Typography,
} from '@mui/material';
import {
  Cloud, Dices, DoorOpen, Eye, EyeOff, Lock, LockOpen, MonitorOff, MonitorPlay, Pencil, Pointer,
  Radio, Ruler, Shapes, SquareDashedMousePointer, Users,
} from 'lucide-react';
import { useToast } from '../../../shared/ToastProvider.jsx';
import { useAuth } from '../../../shared/cloud/AuthProvider.jsx';
import { withSheetVitals } from '../../../shared/campaign/roster.js';
import { usePortraits } from '../../../shared/character/usePortraits.js';
import { patchCharacterData } from '../../../shared/cloud/cloudCharacters.js';
import { DEAD_CONDITION_KEY, setConditionActive } from '../../../shared/character/conditions.js';
import {
  clearLiveScene,
  createDrawing,
  createToken,
  deleteDrawing,
  deleteMapImage,
  deleteToken,
  fetchScene,
  moveDrawing,
  removeSceneImage,
  replaceSceneImage,
  setLiveScene,
  setTokenConditions,
  setTokenEffects,
  setTokenVisibility,
  setTokenSecret,
  signMapImage,
  updateScene,
  updateToken,
  uploadMapImage,
} from '../../../shared/cloud/vtt.js';
import {
  applyTokenEvent,
  dropGhost,
  movableFilter,
  pruneGhosts,
  putGhost,
  resolveTokens,
} from '../../../shared/vtt/liveScene.js';
import {
  canEraseDrawing,
  canMoveDrawing,
  drawingAtPoint,
  lastDrawing,
  movedPoints,
} from '../../../shared/vtt/drawing.js';
import {
  combatantToToken,
  layoutTokens,
  monsterGroupTokens,
} from '../../../shared/vtt/encounterImport.js';
import {
  DEFAULT_FOG_SCALE,
  createFog,
  fogSizeForImage,
  hideAll,
  normalizeFog,
  revealAll,
  setCells,
} from '../../../shared/vtt/fog.js';
import {
  canMarkToken, isTokenVisibleToPlayers, normalizePlayArea, sceneTitleFor, toScene,
} from '../../../shared/vtt/scene.js';
import { sanitizeNoteText } from '../../../shared/vtt/drawing.js';
import { normalizeAtmosphere } from '../../../shared/vtt/atmosphere.js';
import { FEET_PER_CELL } from '../../../shared/vtt/measure.js';
import { VTT_COLORS } from '../../../shared/vtt/colors.js';
import { hexPlayAreaForImage, isHexGrid } from '../../../shared/vtt/hexGeometry.js';
import { useSceneLive } from '../../../shared/vtt/useSceneLive.js';
import { useSceneRole } from '../../../shared/vtt/useSceneRole.js';
import { createCameraSourceId } from '../../../shared/vtt/cameraSync.js';
import {
  projectPlayerTokens, shouldApplyPresenterFrame, spectatorUrl,
} from '../../../shared/vtt/spectator.js';
import { sheetChoicesForRole } from '../../../shared/vtt/sheetView.js';
import {
  DEFAULT_SHEET_SPLIT,
  readSheetSplit,
  sheetGridColumns,
  writeSheetSplit,
} from '../../../shared/vtt/sheetLayout.js';
import { useEncounterBridge } from '../hooks/useEncounterBridge.js';
import { useSceneHexcrawl } from '../hooks/useSceneHexcrawl.js';
import { useSceneDungeon } from '../hooks/useSceneDungeon.js';
import { useSceneContent } from '../hooks/useSceneContent.js';
import { useVttRolls } from '../hooks/useVttRolls.js';
import DungeonPanel from './DungeonPanel.jsx';
import { useMonsterDb } from '../../encounterbuilder/hooks/useMonsterDb.js';
import HexcrawlCorner from './HexcrawlCorner.jsx';
import HexResultDialog from './HexResultDialog.jsx';
import { useConditionEntries } from '../../encounterbuilder/hooks/useConditionEntries.js';
import EncounterImportDialog from './EncounterImportDialog.jsx';
import MonsterPickerDialog from './MonsterPickerDialog.jsx';
import DiceToast from '../../../shared/character/DiceToast.jsx';
import RollLogPanel from './RollLogPanel.jsx';
import PlayerPanel from './PlayerPanel.jsx';
import RosterPanel from './RosterPanel.jsx';
import MapObjectsPanel from './MapObjectsPanel.jsx';
import SceneSwitcher from './SceneSwitcher.jsx';
import SceneToolRail from './SceneToolRail.jsx';
import MapCorner from './MapCorner.jsx';
import BattleMapViewSwitch from './BattleMapViewSwitch.jsx';
import BattleMapSheetResizeHandle from './BattleMapSheetResizeHandle.jsx';
import {
  contentLayoutOpenSx,
  contentLayoutSx,
  editorRootSx,
  fade,
  sceneIdentitySx,
  scenePresenterActionsSx,
  sceneRenameButtonSx,
  sceneTitleSx,
  sceneTopbarSx,
  sceneViewSwitchSx,
  sheetLoadingSx,
  sheetViewSx,
  spectatorRootSx,
  viewportCellStackedSx,
  viewportCellSx,
} from './sceneEditorStyles.js';
import {
  DrawPanel,
  FogPanel,
  LaserPanel,
  LayerPanel,
  MeasurePanel,
} from './ScenePanels.jsx';
import SceneViewport from './SceneViewport.jsx';
import TokenMenu from './TokenMenu.jsx';

const CampaignSheetView = lazy(() => import('../../campaignsheet/CampaignSheetView.jsx'));

const GRID_SAVE_DELAY = 600;
const ATMOSPHERE_SAVE_DELAY = 400;
const GHOST_SWEEP_MS = 2000;
const LASER_TTL_MS = 2500;
const FOG_BROADCAST_MS = 80;
// The GM needs to see what is still hidden from the party without being blind
// to the map underneath; a player gets the real thing.
const GM_FOG_OPACITY = 0.55;
const PLAYER_FOG_OPACITY = 1;
// Only used before the map image has loaded, or when the scene has none yet.
const DEFAULT_MAP_CELLS = { cols: 40, rows: 30 };

// A picture arrives at its own shape rather than as a square: a banner dropped
// as 4x4 has to be un-squashed by hand every single time, and the corner handle
// then keeps whatever ratio it landed with. Four cells on the long side is about
// a rug — big enough to see, small enough not to bury the map.
async function imageSpan(file, longSide = 4) {
  try {
    const bitmap = await createImageBitmap(file);
    const { width, height } = bitmap;
    bitmap.close?.();
    if (!width || !height) return { w: longSide, h: longSide };
    const scale = longSide / Math.max(width, height);
    return {
      w: Math.max(0.5, Math.round(width * scale * 10) / 10),
      h: Math.max(0.5, Math.round(height * scale * 10) / 10),
    };
  } catch {
    // A browser without createImageBitmap, or a file it cannot decode: the
    // upload still goes through and the GM sizes it themselves.
    return { w: longSide, h: longSide };
  }
}

function waitForImage(image) {
  if (typeof image.decode === 'function') return image.decode();
  return new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = () => reject(new Error('Image failed to load.'));
    if (image.complete) {
      if (image.naturalWidth > 0) resolve();
      else reject(new Error('Image failed to load.'));
    }
  });
}

function naturalImageSize(image) {
  const width = Number(image.naturalWidth);
  const height = Number(image.naturalHeight);
  return width > 0 && height > 0 ? { width, height } : null;
}

function paintToolGroup(mode) {
  if (mode === 'marquee') return 'select';
  if (['draw', 'erase', 'text'].includes(mode)) return 'draw';
  if (mode === 'laser') return 'laser';
  if (mode === 'measure') return 'ruler';
  if (mode === 'reveal' || mode === 'hide') return 'fog';
  return 'cursor';
}

export default function SceneEditor({
  scene,
  onSceneChange,
  onOpenScene = null,
  onMapFullscreenChange = null,
  spectator = false,
  spectatorSource = null,
  cameraSourceId = null,
  presenterFollowingRef = null,
}) {
  const { notify } = useToast();
  const { user } = useAuth();
  const role = useSceneRole(scene.campaignId);
  const {
    drawings,
    handleCharacterEvent,
    handleDrawingEvent,
    loading,
    refreshContent,
    refreshVisibleTokens,
    roster,
    setDrawings,
    setRoster,
    setTokens,
    tokenImageUrls,
    tokens,
  } = useSceneContent({ scene, isGm: role.isGm, spectator, notify });
  // Dormant on a square map: it asks the database for nothing until the scene
  // is actually a hexcrawl. A player and the projector read it — the colours and
  // the party marker are the map everyone is looking at — but only the GM's own
  // window may run it, which is why the projector tab is not one even when it is
  // the GM who opened it.
  const hexcrawl = useSceneHexcrawl({ scene, isGm: role.isGm && !spectator });
  const [ghosts, setGhosts] = useState({});
  // After the roster, which sizes the encounters it buys. The bestiary is
  // already loaded for the monster picker; the dungeon uses it to turn a rolled
  // budget in experience into creatures.
  const monsterDb = useMonsterDb();
  const dungeon = useSceneDungeon({
    scene,
    isGm: role.isGm && !spectator,
    monsters: monsterDb.monsters,
    partySize: Math.max(1, roster.length || 4),
    // Not only to size the encounter: a fight sent to the builder takes the
    // party's colours and portraits from these sheets.
    roster,
  });
  // What is actually on screen: the URL and the mode it belongs to, updated
  // together once the picture has loaded.
  const [displayed, setDisplayed] = useState(() => ({
    sceneId: scene.id,
    url: null,
    imageSize: null,
    path: scene.shownImage === 'background' ? scene.backgroundPath || null : scene.imagePath || null,
    shownImage: scene.shownImage,
  }));
  const [busy, setBusy] = useState(false);
  const gridTimerRef = useRef(null);
  const atmosphereTimerRef = useRef(null);
  const playAreaTimerRef = useRef(null);
  const draggingRef = useRef(null);
  const gridEditRef = useRef(false);
  const paintingRef = useRef(false);
  const fogBroadcastRef = useRef(0);
  const [paintMode, setPaintMode] = useState('select');
  const [brushSize, setBrushSize] = useState(3);
  const [activeLayer, setActiveLayer] = useState('tokens');
  // Both top-left panels open in the same spot, so only one of them is out at a
  // time: 'pictures', 'hexcrawl' or nothing.
  const [openCorner, setOpenCorner] = useState(null);
  const [menu, setMenu] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const [monsterOpen, setMonsterOpen] = useState(false);
  const [placementDrag, setPlacementDrag] = useState(null);
  const [imageSize, setImageSize] = useState(null);
  const [selectedDrawingId, setSelectedDrawingId] = useState(null);
  const [drawColor, setDrawColor] = useState(VTT_COLORS.gold);
  const [drawWidth, setDrawWidth] = useState(3);
  const [contentView, setContentView] = useState('map');
  const [mapFullscreen, setMapFullscreen] = useState(false);
  // A local audit mode for the GM. The account keeps GM permissions, while the
  // viewport receives only the same player-safe projection as the projector.
  const [playerPreviewRequested, setGmPlayerPreview] = useState(false);
  const gmPlayerPreview = role.isGm && playerPreviewRequested;
  const [sheetCharacterId, setSheetCharacterId] = useState(null);
  const [, startSheetTransition] = useTransition();
  const [sheetSplit, setSheetSplit] = useState(DEFAULT_SHEET_SPLIT);
  const contentLayoutRef = useRef(null);
  const fallbackCameraSourceRef = useRef(createCameraSourceId());
  const presenterCameraSource = cameraSourceId || fallbackCameraSourceRef.current;
  const cameraPoseRef = useRef(null);
  const frozenCameraPoseRef = useRef(null);
  const [followCameraPose, setFollowCameraPose] = useState(null);
  const localProjectorFollowingRef = useRef(true);
  const projectorFollowingRef = presenterFollowingRef || localProjectorFollowingRef;
  const [projectorFollowing, setProjectorFollowing] = useState(projectorFollowingRef.current);
  // The open projector window is the state; the flag only mirrors it for render.
  // Nothing is persisted: after a reload the controls are gone, and pressing
  // Projector mode again lands on the same named window rather than opening a
  // second one, which hands the handle straight back.
  const projectorWindowRef = useRef(null);
  const [projectorControlsOpen, setProjectorControlsOpen] = useState(false);
  const hasPresenterFrameRef = useRef(false);
  const [projectorShownImage, setProjectorShownImage] = useState(scene.shownImage);
  // The database value is the picture published to players. While presentation
  // is frozen the GM gets a private selection here, so they can prepare the
  // other picture without moving either players or the projector to it.
  const [gmShownImage, setGmShownImage] = useState(scene.shownImage);
  const sceneShownImageRef = useRef(scene.shownImage);
  sceneShownImageRef.current = scene.shownImage;
  const sheetSplitStorageKey = `gb:vtt:sheet-split:${user?.id || 'local'}`;
  const [lasers, setLasers] = useState({});
  const [measureShape, setMeasureShape] = useState('line');
  const [feetPerCell, setFeetPerCell] = useState(FEET_PER_CELL);
  const [remoteMeasure, setRemoteMeasure] = useState(null);
  const presenterInspectionRef = useRef(null);
  const [projectorInspection, setProjectorInspection] = useState(null);
  const conditionEntries = useConditionEntries();
  const {
    clearFeed: clearRollFeed,
    diceThrows,
    dismissToast: dismissRollToast,
    feed: rollFeed,
    handleCustomRoll,
    handleSheetRoll,
    rollBubbles,
    toast: rollToast,
  } = useVttRolls({ campaignId: scene.campaignId, role, roster, tokens });

  useEffect(() => {
    if (!scene.isLive) setProjectorControlsOpen(false);
  }, [scene.isLive]);

  // A projector closed by hand must not leave "Stop projector mode" offering to
  // close a window that is already gone. Checked when this window comes back to
  // the front, which is exactly when closing the other one happened.
  useEffect(() => {
    if (!projectorControlsOpen) return undefined;
    const check = () => {
      if (projectorWindowRef.current?.closed !== false) {
        projectorWindowRef.current = null;
        setProjectorControlsOpen(false);
      }
    };
    window.addEventListener('focus', check);
    return () => window.removeEventListener('focus', check);
  }, [projectorControlsOpen]);


  useEffect(() => {
    // A live-scene switch always wins over a paused camera: enter the new scene
    // on its current picture, accept one fresh presenter snapshot, then remain
    // paused if that is still the GM's chosen mode.
    setProjectorShownImage(scene.shownImage);
    setGmShownImage(scene.shownImage);
    setFollowCameraPose(null);
    hasPresenterFrameRef.current = false;
    presenterInspectionRef.current = null;
    setProjectorInspection(null);
  }, [scene.id]);

  useEffect(() => {
    if (spectator && projectorFollowing) setProjectorShownImage(scene.shownImage);
  }, [projectorFollowing, scene.shownImage, spectator]);

  useEffect(() => {
    if (role.isGm && projectorFollowingRef.current) setGmShownImage(scene.shownImage);
  }, [role.isGm, scene.shownImage]);

  useEffect(() => {
    const storage = typeof window === 'undefined' ? null : window.localStorage;
    setSheetSplit(readSheetSplit(storage, sheetSplitStorageKey));
  }, [sheetSplitStorageKey]);

  const commitSheetSplit = useCallback((value) => {
    const storage = typeof window === 'undefined' ? null : window.localStorage;
    setSheetSplit(writeSheetSplit(storage, sheetSplitStorageKey, value));
  }, [sheetSplitStorageKey]);

  // How many cells the map image covers at the current calibration. Everything
  // sized "to the map" — fog, play area — comes from here.
  // In grid squares: the play area and the "cover everything" check are counted
  // in squares, while the fog itself is counted in its own finer cells.
  const mapCells = useMemo(
    () => (imageSize ? fogSizeForImage(imageSize, scene.grid, 1) : DEFAULT_MAP_CELLS),
    [imageSize, scene.grid],
  );

  const fittedPlayArea = useMemo(() => (
    imageSize && isHexGrid(scene.grid)
      ? hexPlayAreaForImage(imageSize, scene.grid)
      : { x: 0, y: 0, w: mapCells.cols, h: mapCells.rows }
  ), [imageSize, mapCells, scene.grid]);

  const fogCells = useMemo(
    () => (imageSize ? fogSizeForImage(imageSize, scene.grid) : {
      cols: DEFAULT_MAP_CELLS.cols * DEFAULT_FOG_SCALE,
      rows: DEFAULT_MAP_CELLS.rows * DEFAULT_FOG_SCALE,
    }),
    [imageSize, scene.grid],
  );

  // Whichever of the two pictures the table is looking at. The other stays
  // uploaded and one click away.
  const shownImageForViewport = spectator
    ? projectorShownImage
    : role.isGm && !gmPlayerPreview ? gmShownImage : scene.shownImage;
  const shownPath = shownImageForViewport === 'background' ? scene.backgroundPath : scene.imagePath;
  const shownPathOrNull = shownPath || null;
  const displayIsTarget = displayed.sceneId === scene.id
    && displayed.shownImage === shownImageForViewport
    && displayed.path === shownPathOrNull;
  // Keep the complete previous composition on screen while the next image is
  // signed and decoded. Switching the mode immediately used to paint a blank
  // frame between Battlemap and Background, which was the visible flicker. A
  // different scene is never retained: that could expose the previous table's
  // image while navigation is already showing the new scene.
  const canHoldCurrentFrame = displayed.sceneId === scene.id
    && Boolean(displayed.url)
    && Boolean(shownPath);
  const viewportDisplay = displayIsTarget || canHoldCurrentFrame
    ? displayed
    : {
      sceneId: scene.id,
      url: null,
      imageSize: null,
      path: shownPathOrNull,
      shownImage: shownImageForViewport,
    };

  // The picture and everything that belongs to it change together. Flipping the
  // mode as soon as the row changed showed the switch in three steps: fog off,
  // bare map for a beat, then the background — and the reverse on the way back,
  // which briefly showed an uncovered battlemap to the whole table.
  useEffect(() => {
    let cancelled = false;
    if (!shownPath) {
      setDisplayed({
        sceneId: scene.id,
        url: null,
        imageSize: null,
        path: null,
        shownImage: shownImageForViewport,
      });
      return () => { cancelled = true; };
    }

    signMapImage(shownPath)
      .then((url) => {
        if (cancelled || !url) return null;
        // Decoded before it is shown, so the swap is one frame with the new
        // picture already in memory rather than a gap while it downloads.
        const image = new Image();
        image.src = url;
        return waitForImage(image)
          .then(() => {
            if (!cancelled) {
              setDisplayed({
                sceneId: scene.id,
                url,
                imageSize: naturalImageSize(image),
                path: shownPath,
                shownImage: shownImageForViewport,
              });
            }
          });
      })
      .catch(() => {
        if (!cancelled) {
          // Do not replace a valid composition with a broken image. Keeping the
          // previous frame also avoids bringing the transition flicker back.
          notify('error', 'Could not load the scene image.');
        }
      });
    return () => { cancelled = true; };
  }, [scene.id, shownImageForViewport, shownPath]);

  useEffect(() => () => {
    clearTimeout(gridTimerRef.current);
    clearTimeout(atmosphereTimerRef.current);
    clearTimeout(playAreaTimerRef.current);
  }, []);

  useEffect(() => {
    if (!role.isGm) setGmPlayerPreview(false);
  }, [role.isGm]);

  const handleTokenEvent = useCallback((payload) => {
    setTokens((current) => applyTokenEvent(current, payload, { draggingId: draggingRef.current }));
    const id = payload?.new?.id || payload?.old?.id;
    // The committed row supersedes whatever the drag preview was showing.
    if (id) setGhosts((current) => dropGhost(current, id));
  }, []);

  const handleSceneEvent = useCallback((payload) => {
    const next = toScene(payload?.new);
    // Ignore remote scene changes while this client is editing the grid fields
    // or painting: the echo of our own debounced write would overwrite the
    // stroke still in progress.
    if (next && !gridEditRef.current && !paintingRef.current) onSceneChange(next);
  }, [onSceneChange]);

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

    // Fog strokes carry a bitset, not a position.
    if (payload.fog) {
      if (!paintingRef.current) onSceneChange((current) => ({ ...current, fog: normalizeFog(payload.fog) }));
      return;
    }

    // The ruler is shown to the table while it is dragged and stored nowhere,
    // exactly like the laser.
    if (payload.measure !== undefined) {
      setRemoteMeasure(payload.measure || null);
      return;
    }

    if (payload.laser !== undefined) {
      const actor = payload.actor || 'someone';
      setLasers((current) => {
        if (!payload.laser) {
          const next = { ...current };
          delete next[actor];
          return next;
        }
        return {
          ...current,
          [actor]: { ...payload.laser, at: Date.now(), label: nameForRef.current(actor) },
        };
      });
      return;
    }
    setGhosts((current) => putGhost(current, payload));
  }, [onSceneChange, refreshVisibleTokens]);

  const getCameraPose = useCallback(() => cameraPoseRef.current, []);
  const getPresenterState = useCallback(() => ({
    following: projectorFollowingRef.current,
    shownImage: sceneShownImageRef.current,
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
      setProjectorShownImage(next.shownImage);
    }
    hasPresenterFrameRef.current = true;
    projectorFollowingRef.current = next.following;
    setProjectorFollowing(next.following);
  }, []);
  const handleRemotePresenterInspection = useCallback((inspection) => {
    setProjectorInspection(inspection);
  }, []);
  const reconcilePersistentState = useCallback(async () => {
    const [freshScene] = await Promise.all([
      fetchScene(scene.id).catch(() => null),
      refreshContent(),
    ]);
    if (freshScene && !gridEditRef.current && !paintingRef.current) onSceneChange(freshScene);
  }, [onSceneChange, refreshContent, scene.id]);
  const {
    sendDrag, sendCamera, sendPresenterState, sendPresenterInspection,
  } = useSceneLive({
    sceneId: scene.id,
    campaignId: scene.campaignId,
    onTokenEvent: handleTokenEvent,
    onSceneEvent: handleSceneEvent,
    onRemoteDrag: handleRemoteDrag,
    onDrawingEvent: handleDrawingEvent,
    onCharacterEvent: handleCharacterEvent,
    cameraSourceId: role.isGm && !spectator ? presenterCameraSource : null,
    followCameraSource: spectator ? spectatorSource : null,
    getCameraPose,
    onCameraPose: spectator ? handleRemoteCameraPose : undefined,
    getPresenterState,
    onPresenterState: spectator ? handleRemotePresenterState : undefined,
    getPresenterInspection,
    onPresenterInspection: spectator ? handleRemotePresenterInspection : undefined,
    onReconcile: reconcilePersistentState,
  });

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
    const shownImage = following ? gmShownImage : scene.shownImage;
    // Unfreezing publishes the picture the GM prepared. Freezing leaves the
    // persisted picture untouched, which also gives late-joining players the
    // same frozen frame as everyone already connected.
    if (following && shownImage !== scene.shownImage) {
      try {
        await updateScene(scene.id, { shownImage });
        onSceneChange({ ...scene, shownImage });
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
      shownImage,
      pose: following ? cameraPoseRef.current : frozenCameraPoseRef.current,
    });
  }, [gmShownImage, notify, onSceneChange, scene, sendPresenterState]);

  // Switching Map/Background is presenter state as well as persisted scene
  // state. Broadcasting it keeps ordering deterministic relative to a freeze.
  useEffect(() => {
    if (!role.isGm || spectator) return;
    sendPresenterState({
      following: projectorFollowingRef.current,
      shownImage: scene.shownImage,
      pose: cameraPoseRef.current,
    });
  }, [role.isGm, scene.shownImage, sendPresenterState, spectator]);

  // A client that vanishes mid-drag never sends its release; sweeping keeps its
  // piece from being pinned at the ghost position forever.
  useEffect(() => {
    const timer = setInterval(() => {
      setGhosts((current) => pruneGhosts(current));
      // A laser nobody is holding any more: same sweep, shorter patience,
      // because a stale dot reads as a live one.
      setLasers((current) => {
        const now = Date.now();
        const entries = Object.entries(current).filter(([, dot]) => now - dot.at < LASER_TTL_MS);
        return entries.length === Object.keys(current).length ? current : Object.fromEntries(entries);
      });
    }, GHOST_SWEEP_MS);
    return () => clearInterval(timer);
  }, []);

  const canMove = useMemo(
    () => movableFilter({
      isGm: role.isGm,
      ownedCharacterIds: role.ownedCharacterIds,
      // Only the GM has a layer selector; a player is bound by the piece's own
      // layer and nothing else.
      activeLayer: role.isGm ? activeLayer : null,
      userId: user?.id || null,
    }),
    [activeLayer, role.isGm, role.ownedCharacterIds, user?.id],
  );

  const handleDragToken = useCallback((token, position) => {
    draggingRef.current = token.id;
    const moving = { ...token, ...position };
    if (isTokenVisibleToPlayers(moving, scene.playArea)) {
      sendDrag({ id: token.id, x: position.x, y: position.y });
    }
  }, [scene.playArea, sendDrag]);

  const handleMoveToken = useCallback(async (token, position) => {
    const wasVisible = isTokenVisibleToPlayers(token, scene.playArea);
    const willBeVisible = isTokenVisibleToPlayers({ ...token, ...position }, scene.playArea);
    setTokens((current) => current.map((item) => (
      item.id === token.id ? { ...item, ...position } : item
    )));
    try {
      await updateToken(token.id, position);
      if (wasVisible !== willBeVisible) sendDrag({ tokensChanged: true });
    } catch (cause) {
      setTokens((current) => current.map((item) => (item.id === token.id ? token : item)));
      notify('error', cause?.message || 'Could not move that token.');
    } finally {
      // Released only after the write settles: until then a remote echo would
      // still be our own move coming back.
      draggingRef.current = null;
    }
  }, [notify, scene.playArea, sendDrag]);

  const handleMoveTokens = useCallback(async (moves) => {
    const valid = (moves || []).filter(({ token, position }) => (
      token?.id && canMove(token) && Number.isFinite(position?.x) && Number.isFinite(position?.y)
    ));
    if (!valid.length) return;

    const byId = new Map(valid.map(({ token, position }) => [token.id, { token, position }]));
    setTokens((current) => current.map((item) => {
      const move = byId.get(item.id);
      return move ? { ...item, ...move.position } : item;
    }));

    const results = await Promise.allSettled(
      valid.map(({ token, position }) => updateToken(token.id, position)),
    );
    const failedIds = new Set(results.flatMap((result, index) => (
      result.status === 'rejected' ? [valid[index].token.id] : []
    )));
    if (failedIds.size) {
      setTokens((current) => current.map((item) => (
        failedIds.has(item.id) ? valid.find(({ token }) => token.id === item.id).token : item
      )));
      notify('error', `${failedIds.size} selected piece${failedIds.size === 1 ? '' : 's'} could not be moved.`);
    }

    const crossedVisibilityBoundary = valid.some(({ token, position }, index) => (
      results[index].status === 'fulfilled'
      && isTokenVisibleToPlayers(token, scene.playArea)
        !== isTokenVisibleToPlayers({ ...token, ...position }, scene.playArea)
    ));
    if (crossedVisibilityBoundary) sendDrag({ tokensChanged: true });
  }, [canMove, notify, scene.playArea, sendDrag]);

  const handleObjectStyle = useCallback(async (token, patch) => {
    const localPatch = {};
    const rowPatch = {};
    if (Object.hasOwn(patch, 'color')) {
      localPatch.color = patch.color;
      rowPatch.color = patch.color;
    }
    if (!Object.keys(rowPatch).length) return;

    setTokens((current) => current.map((item) => (
      item.id === token.id ? { ...item, ...localPatch } : item
    )));
    try {
      await updateToken(token.id, rowPatch);
    } catch (cause) {
      setTokens((current) => current.map((item) => (item.id === token.id ? token : item)));
      notify('error', cause?.message || 'Could not update that object.');
    }
  }, [notify]);

  // Showing a piece to the table, or taking it back. Visibility is independent
  // from the editing layer, so revealing scenery does not silently turn it into
  // a token. Legacy GM-layer rows fall back to the token layer only because they
  // predate the separate visibility column and have no public layer to restore.
  const handleTokenVisibility = useCallback(async (token, gmOnly) => {
    if (!token || Boolean(token.hiddenFromPlayers) === Boolean(gmOnly)) return;
    const nextLayer = !gmOnly && token.layer === 'gm' ? 'tokens' : token.layer;
    setTokens((current) => current.map((item) => (
      item.id === token.id
        ? { ...item, layer: nextLayer, hiddenFromPlayers: Boolean(gmOnly) }
        : item
    )));
    try {
      const updated = await setTokenVisibility(token.id, gmOnly, token.layer);
      setTokens((current) => current.map((item) => (item.id === token.id ? updated : item)));
      sendDrag({ tokensChanged: true });
    } catch (cause) {
      setTokens((current) => current.map((item) => (item.id === token.id ? token : item)));
      notify('error', cause?.message || 'Could not change who can see that piece.');
    }
  }, [notify, sendDrag]);

  const handleGridChange = useCallback((grid) => {
    gridEditRef.current = true;
    onSceneChange({ ...scene, grid });
    clearTimeout(gridTimerRef.current);
    gridTimerRef.current = setTimeout(() => {
      updateScene(scene.id, { grid })
        .catch((cause) => notify('error', cause?.message || 'Could not save the grid.'))
        .finally(() => { gridEditRef.current = false; });
    }, GRID_SAVE_DELAY);
  }, [notify, onSceneChange, scene]);

  const handleAtmosphereChange = useCallback((atmosphere) => {
    const next = normalizeAtmosphere(atmosphere);
    gridEditRef.current = true;
    onSceneChange({ ...scene, atmosphere: next });
    clearTimeout(atmosphereTimerRef.current);
    atmosphereTimerRef.current = setTimeout(() => {
      updateScene(scene.id, { atmosphere: next })
        .catch((cause) => notify('error', cause?.message || 'Could not save the atmosphere.'))
        .finally(() => { gridEditRef.current = false; });
    }, ATMOSPHERE_SAVE_DELAY);
  }, [notify, onSceneChange, scene]);

  // Painting mirrors the token drag: every stroke frame goes out on broadcast,
  // and the database sees one write when the brush lifts.
  const handlePaint = useCallback((cells, revealed) => {
    paintingRef.current = true;
    onSceneChange((current) => {
      const fog = setCells(current.fog, cells, revealed);
      if (!fog) return current;
      const now = Date.now();
      if (now - fogBroadcastRef.current >= FOG_BROADCAST_MS) {
        fogBroadcastRef.current = now;
        sendDrag({ fog });
      }
      return { ...current, fog };
    });
  }, [onSceneChange, sendDrag]);

  const commitFog = useCallback((fog) => {
    paintingRef.current = false;
    sendDrag({ fog });
    updateScene(scene.id, { fog }).catch((cause) => {
      notify('error', cause?.message || 'Could not save the fog.');
    });
  }, [notify, scene.id, sendDrag]);

  const handlePaintEnd = useCallback(() => {
    onSceneChange((current) => {
      commitFog(current.fog);
      return current;
    });
  }, [commitFog, onSceneChange]);

  // Sized from the map, not from a constant: a fixed grid left the far side of
  // a large image permanently uncovered, which is worse than no fog at all.
  const handleEnableFog = useCallback(() => {
    const { cols, rows } = fogCells;
    const fog = createFog(cols, rows);
    onSceneChange({ ...scene, fog });
    setPaintMode('reveal');
    commitFog(fog);
  }, [commitFog, fogCells, onSceneChange, scene]);

  const handleFogAll = useCallback((revealed) => {
    onSceneChange((current) => {
      // Covering everything means everything: if the map grew, or the grid was
      // recalibrated finer, the old fog no longer reaches the edges and is
      // rebuilt at the current size rather than leaving a bright margin.
      const tooSmall = current.fog
        && (current.fog.cols < fogCells.cols || current.fog.rows < fogCells.rows);
      const fog = revealed
        ? revealAll(current.fog)
        : (tooSmall ? createFog(fogCells.cols, fogCells.rows) : hideAll(current.fog));
      if (!fog) return current;
      commitFog(fog);
      return { ...current, fog };
    });
  }, [commitFog, fogCells, onSceneChange]);

  // The stroke is drawn locally as it happens; this is the single write when the
  // pen lifts, and it goes to its own row so undo is a delete.
  const handleDrawEnd = useCallback(async (points) => {
    try {
      const created = await createDrawing(scene.id, {
        points,
        color: drawColor,
        width: drawWidth,
        layer: role.isGm ? activeLayer : 'tokens',
      });
      if (created) setDrawings((current) => [...current, created]);
    } catch (cause) {
      notify('error', cause?.message || 'Could not save that stroke.');
    }
  }, [activeLayer, drawColor, drawWidth, notify, role.isGm, scene.id]);

  const removeDrawing = useCallback(async (drawing) => {
    if (!drawing) return;
    setDrawings((current) => current.filter((item) => item.id !== drawing.id));
    try {
      await deleteDrawing(drawing.id);
    } catch (cause) {
      setDrawings((current) => [...current, drawing]);
      notify('error', cause?.message || 'Could not remove that stroke.');
    }
  }, [notify]);

  // Only what this person is allowed to rub out, so the eraser never sits on a
  // stroke it cannot take and looks broken.
  const erasable = useMemo(
    () => drawings.filter((drawing) => canEraseDrawing(drawing, { isGm: role.isGm, userId: user?.id })),
    [drawings, role.isGm, user?.id],
  );

  const handleErase = useCallback((point) => {
    removeDrawing(drawingAtPoint(erasable, point));
  }, [erasable, removeDrawing]);

  // What is under the pointer and yours to pick up. The same rule as the
  // eraser's, so nothing offers itself to be dragged and then refuses to move.
  const movableDrawing = useCallback((point) => (
    drawingAtPoint(
      drawings.filter((drawing) => canMoveDrawing(drawing, { isGm: role.isGm, userId: user?.id })),
      point,
    )
  ), [drawings, role.isGm, user?.id]);

  const handleMoveDrawing = useCallback(async (drawing, offset) => {
    const points = movedPoints(drawing, offset.x, offset.y);
    // Shown where it was dropped straight away; the row catches up.
    setDrawings((current) => current.map((item) => (
      item.id === drawing.id ? { ...item, points } : item
    )));
    try {
      await moveDrawing(drawing.id, points);
    } catch (cause) {
      setDrawings((current) => current.map((item) => (
        item.id === drawing.id ? drawing : item
      )));
      notify('error', cause?.message || 'Could not move that mark.');
    }
  }, [notify]);

  // A note is a stroke with words on it, so it takes the same path: same table,
  // same visibility rules, same undo and eraser.
  const handleWriteNote = useCallback(async (point) => {
    const text = sanitizeNoteText(window.prompt('Write on the map'));
    if (!text) return;
    try {
      const created = await createDrawing(scene.id, {
        points: [point],
        text,
        color: drawColor,
        width: drawWidth,
        layer: role.isGm ? activeLayer : 'tokens',
      });
      if (created) setDrawings((current) => [...current, created]);
    } catch (cause) {
      notify('error', cause?.message || 'Could not write that note.');
    }
  }, [activeLayer, drawColor, drawWidth, notify, role.isGm, scene.id]);

  // The laser is a finger pointing at the map: broadcast only, never written
  // down, and it fades on its own so a dropped connection cannot leave a dot
  // burning on someone's screen.
  const handleMeasure = useCallback((next) => {
    sendDrag({ measure: next });
  }, [sendDrag]);

  const handleLaser = useCallback((point) => {
    sendDrag({ laser: point ? { x: point.x, y: point.y } : null });
    setLasers((current) => {
      const id = user?.id || 'me';
      if (!point) {
        const next = { ...current };
        delete next[id];
        return next;
      }
      // No label on your own: you know where your own hand is, and a name stuck
      // to your cursor is only in the way.
      return { ...current, [id]: { x: point.x, y: point.y, at: Date.now(), label: null, local: true } };
    });
  }, [sendDrag, user?.id]);

  const handleUndoDrawing = useCallback(() => {
    removeDrawing(lastDrawing(erasable));
  }, [erasable, removeDrawing]);

  const handleToggleLive = useCallback(async () => {
    try {
      if (scene.isLive) {
        await clearLiveScene(scene.campaignId);
        onSceneChange({ ...scene, isLive: false });
      } else {
        onSceneChange(await setLiveScene(scene.id));
      }
    } catch (cause) {
      notify('error', cause?.message || 'Could not change the live scene.');
    }
  }, [notify, onSceneChange, scene]);

  // Scenes get named while they are being played ("the tavern" turns out to be
  // "the ambush"), so the name is editable here and not only from the scene
  // list. Nothing to hide from the players: they never see it.
  const handleRename = useCallback(async () => {
    const next = window.prompt('Scene name', scene.name);
    if (next === null) return;
    try {
      onSceneChange(await updateScene(scene.id, { name: next }));
    } catch (cause) {
      notify('error', cause?.message || 'Could not rename the scene.');
    }
  }, [notify, onSceneChange, scene.id, scene.name]);

  // Debounced like the grid: dragging a number field should not write a row per
  // keystroke, and this one changes what the players can see.
  const handlePlayAreaChange = useCallback((playArea) => {
    const area = normalizePlayArea(playArea);
    gridEditRef.current = true;
    onSceneChange({ ...scene, playArea: area });
    clearTimeout(playAreaTimerRef.current);
    playAreaTimerRef.current = setTimeout(() => {
      updateScene(scene.id, { playArea: area })
        .then(() => sendDrag({ tokensChanged: true }))
        .catch((cause) => notify('error', cause?.message || 'Could not save the play area.'))
        .finally(() => { gridEditRef.current = false; });
    }, GRID_SAVE_DELAY);
  }, [notify, onSceneChange, scene, sendDrag]);

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
    const same = (left, right) => left && right
      && left.x === right.x && left.y === right.y && left.w === right.w && left.h === right.h;
    if (same(current, legacy) && !same(current, fittedPlayArea)) handlePlayAreaChange(fittedPlayArea);
  }, [fittedPlayArea, handlePlayAreaChange, imageSize, mapCells, role.isGm, scene.grid, scene.playArea, shownImageForViewport, spectator]);

  // One upload path for both slots: the only difference is which column it
  // lands in, and which picture the table then sees.
  const uploadSceneImage = useCallback(async (file, slot) => {
    setBusy(true);
    try {
      const { scene: updated, cleanupError } = await replaceSceneImage(scene, slot, file);
      onSceneChange(updated);
      if (cleanupError) {
        notify('warning', 'The new image was saved, but the previous file could not be cleaned up.');
      }
    } catch (cause) {
      notify('error', cause?.message || 'Could not upload that image.');
    } finally {
      setBusy(false);
    }
  }, [notify, onSceneChange, scene]);

  const handleUploadMap = useCallback((file) => uploadSceneImage(file, 'map'), [uploadSceneImage]);
  const handleUploadBackground = useCallback(
    (file) => uploadSceneImage(file, 'background'),
    [uploadSceneImage],
  );

  const handleRemoveSceneImage = useCallback(async (slot) => {
    setBusy(true);
    try {
      const { scene: updated, cleanupError } = await removeSceneImage(scene, slot);
      onSceneChange(updated);
      if (cleanupError) {
        notify('warning', 'The picture was removed, but its uploaded file could not be cleaned up.');
      }
    } catch (cause) {
      notify('error', cause?.message || 'Could not remove that picture.');
    } finally {
      setBusy(false);
    }
  }, [notify, onSceneChange, scene]);

  const handleRemoveMap = useCallback(
    () => handleRemoveSceneImage('map'),
    [handleRemoveSceneImage],
  );
  const handleRemoveBackground = useCallback(
    () => handleRemoveSceneImage('background'),
    [handleRemoveSceneImage],
  );

  const handleShownImageChange = useCallback(async (shownImage) => {
    setGmShownImage(shownImage);
    // A frozen selection is private preparation. The public scene row remains
    // on its previous picture until the GM explicitly resumes sharing.
    if (role.isGm && !projectorFollowingRef.current) return;
    onSceneChange({ ...scene, shownImage });
    try {
      await updateScene(scene.id, { shownImage });
    } catch (cause) {
      notify('error', cause?.message || 'Could not switch the picture.');
    }
  }, [notify, onSceneChange, role.isGm, scene]);

  const addToken = useCallback(async (token) => {
    setBusy(true);
    try {
      const created = await createToken(scene.id, token);
      setTokens((current) => (
        current.some((item) => item.id === created.id) ? current : [...current, created]
      ));
      return created;
    } catch (cause) {
      notify('error', cause?.message || 'Could not add that token.');
      return null;
    } finally {
      setBusy(false);
    }
  }, [notify, scene.id]);

  const canPlacePiece = useCallback(() => {
    if (shownImageForViewport !== 'background') return true;
    notify('warning', 'Switch to the battlemap before placing or moving pieces.');
    return false;
  }, [notify, shownImageForViewport]);

  const nextFreeCell = useCallback(() => {
    const taken = new Set(tokens.map((token) => `${Math.round(token.x)}:${Math.round(token.y)}`));
    // A player's click-placement must land inside the play area they are
    // allowed to receive. Putting it at absolute 0,0 could create a row which
    // RLS immediately hides from the player who just created it.
    const startX = scene.playArea?.x || 0;
    const startY = scene.playArea?.y || 0;
    const cols = Math.min(20, scene.playArea?.w || 20);
    const rows = Math.min(20, scene.playArea?.h || 20);
    for (let row = startY; row < startY + rows; row += 1) {
      for (let col = startX; col < startX + cols; col += 1) {
        if (!taken.has(`${col}:${row}`)) return { x: col, y: row };
      }
    }
    return { x: startX, y: startY };
  }, [scene.playArea, tokens]);

  // An extra picture is a piece, not a third slot: it can be moved, resized and
  // removed like everything else. It lands on the layer being edited — scenery
  // on the map layer, a handout among the tokens, something the party must not
  // see yet on the GM layer.
  const handleAddImage = useCallback(async (file) => {
    setBusy(true);
    let uploadedPath = null;
    try {
      const span = await imageSpan(file);
      uploadedPath = await uploadMapImage(scene.campaignId, scene.id, file);
      const created = await createToken(scene.id, {
        ...nextFreeCell(),
        layer: activeLayer,
        ...span,
        label: '',
        image_path: uploadedPath,
      });
      setTokens((current) => [...current, created]);
    } catch (cause) {
      if (uploadedPath) {
        try { await deleteMapImage(uploadedPath); } catch {}
      }
      notify('error', cause?.message || 'Could not add that image.');
    } finally {
      setBusy(false);
    }
  }, [activeLayer, nextFreeCell, notify, scene.campaignId, scene.id]);

  const characterToken = useCallback((entry, position) => ({
    ...position,
    // A party piece is always a piece the party can see, whatever layer the GM
    // happens to be editing.
    layer: 'tokens',
    characterId: entry.characterId,
    label: entry.name,
    color: entry.color,
    className: entry.className,
    deathSaves: entry.deathSaves,
  }), []);

  const handlePlaceCharacter = useCallback((entry) => {
    if (!canPlacePiece()) return;
    if (tokens.some((token) => token.characterId === entry.characterId)) return;
    addToken(characterToken(entry, nextFreeCell()));
  }, [addToken, canPlacePiece, characterToken, nextFreeCell, tokens]);

  const handleDropCharacter = useCallback((characterId, position) => {
    if (!canPlacePiece()) return;
    const entry = roster.find((item) => item.characterId === characterId);
    if (!entry) return;
    if (tokens.some((token) => token.characterId === characterId)) return;
    addToken(characterToken(entry, position));
  }, [addToken, canPlacePiece, characterToken, roster, tokens]);

  // Same placement path as an encounter import, minus the fight: a creature
  // dropped on the map has nothing to stay in step with.
  const handlePlaceMonster = useCallback(async (monster, count, { layer, position } = {}) => {
    if (!canPlacePiece()) return;
    setBusy(true);
    try {
      const laid = layoutTokens(
        monsterGroupTokens(monster, count, { layer }),
        tokens,
        position ? { origin: position } : undefined,
      );
      for (const token of laid) {
        // eslint-disable-next-line no-await-in-loop
        const created = await createToken(scene.id, token);
        setTokens((current) => (
          current.some((item) => item.id === created.id) ? current : [...current, created]
        ));
      }
    } catch (cause) {
      notify('error', cause?.message || 'Could not place that creature.');
    } finally {
      setBusy(false);
    }
  }, [canPlacePiece, notify, scene.id, tokens]);

  const handleAddToken = useCallback(async (draft = {}, position) => {
    if (!canPlacePiece()) return;
    const layer = draft.layer || activeLayer;
    let uploadedPath = null;
    setBusy(true);
    try {
      if (draft.imageFile) {
        uploadedPath = await uploadMapImage(scene.campaignId, scene.id, draft.imageFile);
      }
      const created = await createToken(scene.id, {
        ...(position || nextFreeCell()),
        layer,
        label: String(draft.label || '').trim() || (layer === 'gm' ? 'Hidden' : 'Token'),
        color: draft.color || null,
        image_path: uploadedPath,
      });
      setTokens((current) => (
        current.some((item) => item.id === created.id) ? current : [...current, created]
      ));
    } catch (cause) {
      if (uploadedPath) {
        try { await deleteMapImage(uploadedPath); } catch {}
      }
      notify('error', cause?.message || 'Could not add that token.');
    } finally {
      setBusy(false);
    }
  }, [activeLayer, canPlacePiece, nextFreeCell, notify, scene.campaignId, scene.id, setTokens]);

  // A player's marker always lands on the token layer: they have no layer
  // selector, and the GM layer is not theirs to write to — the insert policy
  // would refuse it anyway.
  const handleAddMarker = useCallback(() => {
    if (!canPlacePiece()) return;
    addToken({
      ...nextFreeCell(),
      layer: 'tokens',
      label: 'Marker',
    });
  }, [addToken, canPlacePiece, nextFreeCell]);

  const handlePlaceObject = useCallback(async (object, position) => {
    if (!object?.key) return;
    if (!canPlacePiece()) return;
    // A dungeon marker's label is the GM's own note — "Pit · DC 13 · 2d6". It is
    // kept in the secret table rather than on the row, so springing the trap
    // later shows the party an icon and not the numbers they are about to roll
    // against. The GM still reads it on the piece: a secret label replaces the
    // public one for them.
    const secret = object.secretLabel ? String(object.label || '') : '';
    const targetLayer = object.layer || (role.isGm ? activeLayer : 'tokens');
    const created = await addToken({
      ...(position || nextFreeCell()),
      layer: targetLayer,
      hiddenFromPlayers: targetLayer === 'gm',
      label: secret ? '' : object.label,
      color: object.color || VTT_COLORS.gold,
      iconKey: object.key,
      iconStrokeWidth: object.strokeWidth,
      rotation: 0,
      w: 1,
      h: 1,
    });
    if (!created || !secret) return;
    try {
      await setTokenSecret(created.id, secret);
      setTokens((current) => current.map((item) => (
        item.id === created.id ? { ...item, secretLabel: secret } : item
      )));
    } catch (cause) {
      notify('error', cause?.message || 'The marker was placed, but its note could not be kept secret.');
    }
  }, [activeLayer, addToken, canPlacePiece, nextFreeCell, notify, role.isGm]);

  const handleImportEncounter = useCallback(async (
    combatants, { layer, instanceId, fightId, position } = {},
  ) => {
    if (!canPlacePiece()) return;
    setBusy(true);
    setImportOpen(false);
    try {
      const laid = layoutTokens(
        combatants.map((combatant) => combatantToToken(combatant, { layer, instanceId, fightId })),
        tokens,
        position ? { origin: position } : undefined,
      );
      // Sequential rather than parallel: a burst of inserts on one scene is the
      // easiest way to hit a rate limit, and the order they land in is the order
      // the GM sees them appear.
      for (const token of laid) {
        // eslint-disable-next-line no-await-in-loop
        const created = await createToken(scene.id, token);
        setTokens((current) => (
          current.some((item) => item.id === created.id) ? current : [...current, created]
        ));
      }
    } catch (cause) {
      notify('error', cause?.message || 'Could not import that encounter.');
    } finally {
      setBusy(false);
    }
  }, [canPlacePiece, notify, scene.id, tokens]);

  const handleDropPlacement = useCallback((placement, position) => {
    if (!placement) return;
    setPlacementDrag(null);
    if (placement.kind === 'character') {
      handleDropCharacter(placement.characterId, position);
    } else if (placement.kind === 'monster') {
      handlePlaceMonster(placement.monster, placement.count, {
        layer: placement.layer,
        position,
      });
    } else if (placement.kind === 'encounter') {
      handleImportEncounter(placement.combatants, {
        layer: placement.layer,
        instanceId: placement.instanceId,
        fightId: placement.fightId,
        position,
      });
    } else if (placement.kind === 'token') {
      handleAddToken(placement.token, position);
    } else if (placement.kind === 'object') {
      handlePlaceObject(placement.object, position);
    }
  }, [handleAddToken, handleDropCharacter, handleImportEncounter, handlePlaceMonster, handlePlaceObject]);

  // Label and conditions in one write. A GM-only label goes to its own table:
  // keeping it on the token row would deliver it to the players.
  // A player's only write on a piece that is not theirs. It goes through the
  // RPC, which touches the conditions column and nothing else.
  // Hit points arriving from the encounter builder. Written to the rows because
  // a monster's piece owns them — unlike a character's, which reads its sheet.
  const applyTokenVitals = useCallback((updates) => {
    setTokens((current) => current.map((token) => {
      const update = updates.find((item) => item.id === token.id);
      return update
        ? {
          ...token,
          ...(Object.hasOwn(update, 'hpCurrent') ? { hpCurrent: update.hpCurrent } : {}),
          ...(Object.hasOwn(update, 'hpMax') ? { hpMax: update.hpMax } : {}),
          ...(Object.hasOwn(update, 'conditions') ? { conditions: update.conditions } : {}),
          ...(Object.hasOwn(update, 'effects') ? { effects: update.effects } : {}),
          ...(Object.hasOwn(update, 'deathSaves') ? { deathSaves: update.deathSaves } : {}),
        }
        : token;
    }));
    for (const update of updates) {
      if (update.characterId) {
        const characterVitals = update.characterVitals || {};
        patchCharacterData(update.characterId, {
          currentHP: characterVitals.currentHP,
          activeConditions: characterVitals.activeConditions,
          deathSaves: characterVitals.deathSaves,
        }).catch(() => {
          // The encounter remains authoritative and its next save retries.
        });
        continue;
      }
      updateToken(update.id, {
        hp_current: update.hpCurrent,
        hp_max: update.hpMax,
        conditions: update.conditions,
        effects: update.effects,
      })
        .catch(() => {
          // Best-effort: the encounter builder is the authority here, and the
          // next save will try again.
        });
    }
  }, []);

  const { push: pushToEncounter } = useEncounterBridge({
    tokens: role.isGm && !spectator ? tokens : [],
    onTokenVitals: applyTokenVitals,
  });

  // A character's conditions live on their sheet, which is what the encounter
  // builder and the sheet view both read. Writing them onto the token row would
  // create a second copy that the next sheet update silently overwrites.
  const writeConditions = useCallback(async (token, conditions) => {
    if (token.characterId) {
      await patchCharacterData(token.characterId, { activeConditions: conditions });
      return;
    }
    await setTokenConditions(token.id, conditions);
  }, []);

  const handleMarkToken = useCallback(async (token, {
    conditions, showHp, effects, hpCurrent, deathSaves,
  }) => {
    // On a piece of their own, a player may also decide whether it wears a hit
    // point bar — that is an ordinary update the row policy already allows.
    const owned = canMove(token);
    setTokens((current) => current.map((item) => (
      item.id === token.id
        ? {
          ...item,
          conditions,
          effects,
          ...(owned ? { showHp, hpCurrent, deathSaves } : {}),
        }
        : item
    )));
    try {
      if (token.characterId && owned) {
        await patchCharacterData(token.characterId, {
          activeConditions: conditions,
          currentHP: hpCurrent,
          deathSaves,
        });
      } else {
        await writeConditions(token, conditions);
      }
      // Both marks go through their own function, which writes one column and
      // checks the table rather than the row: calling out that the ogre has
      // advantage is not the same as being handed the ogre.
      await setTokenEffects(token.id, effects);
      if (owned) await updateToken(token.id, { show_hp: showHp });
      pushToEncounter({ ...token, conditions, effects, hpCurrent, deathSaves });
    } catch (cause) {
      setTokens((current) => current.map((item) => (item.id === token.id ? token : item)));
      notify('error', cause?.message || 'Could not mark that token.');
    }
  }, [canMove, notify, pushToEncounter, writeConditions]);

  const handleSaveToken = useCallback(async (token, {
    label, gmOnly, conditions, hpCurrent, hpMax, showHp, effects, deathSaves,
  }) => {
    const publicLabel = gmOnly ? '' : label;
    const secret = gmOnly ? label : '';
    // A character's piece never writes hit points: the sheet owns them, and this
    // would be a copy that the next sheet update overwrites. Whether the bar is
    // shown, though, is the piece's own business either way.
    const vitals = token.characterId ? {} : { hp_current: hpCurrent, hp_max: hpMax };
    setTokens((current) => current.map((item) => (
      item.id === token.id
        ? {
          ...item,
          label: publicLabel,
          secretLabel: secret,
          conditions,
          effects,
          showHp,
          hpCurrent,
          deathSaves,
          ...(token.characterId ? {} : { hpMax }),
        }
        : item
    )));
    try {
      // Conditions take the route that suits the piece: a character's go to the
      // sheet, a monster's to its own row.
      if (token.characterId) {
        await patchCharacterData(token.characterId, {
          activeConditions: conditions,
          currentHP: hpCurrent,
          deathSaves,
        });
      } else {
        await writeConditions(token, conditions);
      }
      await updateToken(token.id, {
        label: publicLabel, effects, show_hp: showHp, ...vitals,
      });
      if (secret !== (token.secretLabel || '')) await setTokenSecret(token.id, secret);
      // Back to the encounter builder, if its tab is around to hear it. A
      // character's piece is matched to its combatant by the sheet it stands
      // for, so this is not limited to imported monsters.
      pushToEncounter({ ...token, hpCurrent, hpMax, conditions, effects, deathSaves });
    } catch (cause) {
      setTokens((current) => current.map((item) => (item.id === token.id ? token : item)));
      notify('error', cause?.message || 'Could not update that token.');
    }
  }, [notify]);

  const handleDeathSaveChange = useCallback((token, type, value) => {
    if (!token?.characterId || !['success', 'fail'].includes(type)) return;
    const deathSaves = {
      success: Math.max(0, Math.min(3, Number(token.deathSaves?.success) || 0)),
      fail: Math.max(0, Math.min(3, Number(token.deathSaves?.fail) || 0)),
      [type]: Math.max(0, Math.min(3, Number(value) || 0)),
    };
    const conditions = setConditionActive(
      token.conditions || [],
      DEAD_CONDITION_KEY,
      deathSaves.fail >= 3,
    );
    const patch = {
      label: token.secretLabel || token.label || '',
      gmOnly: Boolean(token.secretLabel),
      conditions,
      hpCurrent: 0,
      hpMax: token.hpMax,
      showHp: token.showHp,
      effects: token.effects || [],
      deathSaves,
    };
    if (role.isGm) handleSaveToken(token, patch);
    else handleMarkToken(token, patch);
  }, [handleMarkToken, handleSaveToken, role.isGm]);

  const handleDeleteToken = useCallback(async (token) => {
    setBusy(true);
    try {
      const { cleanupError } = await deleteToken(token.id, token.imagePath);
      setTokens((current) => current.filter((item) => item.id !== token.id));
      if (cleanupError) {
        notify('warning', 'The piece was removed, but its uploaded image could not be cleaned up.');
      }
    } catch (cause) {
      notify('error', cause?.message || 'Could not remove that token.');
    } finally {
      setBusy(false);
    }
  }, [notify]);

  const handleDeleteTokens = useCallback(async (selected) => {
    const pieces = (selected || []).filter((token) => token?.id && canMove(token));
    if (!pieces.length) return false;
    if (!window.confirm(`Delete ${pieces.length} selected piece${pieces.length === 1 ? '' : 's'}?`)) return false;

    setBusy(true);
    let allRemoved = false;
    try {
      const results = await Promise.allSettled(
        pieces.map((token) => deleteToken(token.id, token.imagePath)),
      );
      const removedIds = new Set(results.flatMap((result, index) => (
        result.status === 'fulfilled' ? [pieces[index].id] : []
      )));
      setTokens((current) => current.filter((token) => !removedIds.has(token.id)));

      const cleanupFailures = results.filter((result) => (
        result.status === 'fulfilled' && result.value.cleanupError
      )).length;
      const deleteFailures = results.length - removedIds.size;
      allRemoved = deleteFailures === 0;
      if (cleanupFailures) notify('warning', 'The pieces were removed, but some uploaded images could not be cleaned up.');
      if (deleteFailures) notify('error', `${deleteFailures} selected piece${deleteFailures === 1 ? '' : 's'} could not be removed.`);
    } finally {
      setBusy(false);
    }
    return allRemoved;
  }, [canMove, notify]);

  const handleRemoveCharacter = useCallback((entry) => {
    const token = tokens.find((item) => item.characterId === entry.characterId);
    if (token) handleDeleteToken(token);
  }, [handleDeleteToken, tokens]);

  // Only the fog brushes belong to the GM. Listing them, rather than listing
  // what a player may hold, is what stopped the laser and the ruler from being
  // quietly downgraded to 'select' every time a new tool was added.
  const allowedPaintMode = useMemo(() => {
    // Nothing to paint on a background: no fog, no board, nothing that would be
    // saved anywhere. The laser and the ruler still work — pointing at a picture
    // is exactly what a background is for.
    const showingBackground = shownImageForViewport === 'background';
    if (showingBackground && !['select', 'laser', 'measure'].includes(paintMode)) return 'select';
    const gmOnly = paintMode === 'reveal' || paintMode === 'hide';
    return gmOnly && !role.isGm ? 'select' : paintMode;
  }, [paintMode, role.isGm, shownImageForViewport]);

  // Who a broadcast came from, in words. The campaign's sheets carry their
  // owner's username, which is the only name this page ever learns.
  const nameForActor = useCallback((actor) => {
    if (!actor) return 'Someone';
    if (actor === role.gmId) return 'GM';
    const entry = roster.find((item) => item.ownerId === actor);
    return entry?.ownerUsername || entry?.name || 'Player';
  }, [role.gmId, roster]);

  // Read through a ref: the realtime handler is registered once, and closing
  // over the roster would leave it naming people from an empty list.
  const nameForRef = useRef(nameForActor);
  nameForRef.current = nameForActor;

  const laserDots = useMemo(() => (
    Object.entries(lasers).map(([id, dot]) => ({ ...dot, id }))
  ), [lasers]);

  // What the rail offers, in the order a session needs it. A player gets the two
  // groups that are theirs; the rest would only be buttons the database refuses.
  const toolGroups = useMemo(() => {
    const rollsGroup = {
      id: 'rolls',
      label: 'Rolls',
      icon: Dices,
      content: ({ closePanel }) => (
        <RollLogPanel
          feed={rollFeed}
          onCustomRoll={(formula) => {
            handleCustomRoll(formula);
            closePanel();
          }}
          onClear={clearRollFeed}
        />
      ),
    };

    const drawGroup = {
      id: 'draw',
      label: 'Draw',
      icon: Pencil,
      onActivate: () => setPaintMode('draw'),
      content: (
        <DrawPanel
          busy={busy}
          paintMode={paintMode}
          drawColor={drawColor}
          drawWidth={drawWidth}
          canUndo={erasable.length > 0}
          onPaintModeChange={setPaintMode}
          onDrawColorChange={setDrawColor}
          onDrawWidthChange={setDrawWidth}
          onUndoDrawing={handleUndoDrawing}
        />
      ),
    };

    const objectsGroup = {
      id: 'objects',
      label: 'Objects',
      icon: Shapes,
      content: (
        <MapObjectsPanel
          busy={busy}
          layer={role.isGm ? activeLayer : 'tokens'}
          onPlace={(object) => {
            setPaintMode('select');
            handlePlaceObject(object);
          }}
          onPlacementDragStart={(placement) => {
            setPaintMode('select');
            setPlacementDrag(placement);
          }}
          onPlacementDragEnd={() => setPlacementDrag(null)}
        />
      ),
    };

    const selectGroup = {
      id: 'select',
      label: 'Select',
      icon: SquareDashedMousePointer,
      onActivate: () => setPaintMode('marquee'),
      content: (
        <Typography variant="caption" color="text.secondary">
          Drag a rectangle over pieces you can control. Drag any selected piece to move the group;
          hold Shift or Ctrl to add another area. Use Delete or Backspace to remove it, and Escape to clear.
        </Typography>
      ),
    };

    if (!role.isGm) {
      return [
        selectGroup,
        {
          id: 'pieces',
          label: 'Pieces',
          icon: Users,
          content: (
            <PlayerPanel
              roster={roster}
              tokens={tokens}
              ownedCharacterIds={role.ownedCharacterIds}
              busy={busy}
              placementDisabled={shownImageForViewport === 'background'}
              onPlaceCharacter={handlePlaceCharacter}
              onRemoveCharacter={handleRemoveCharacter}
              onAddMarker={handleAddMarker}
              onPlacementDragStart={setPlacementDrag}
              onPlacementDragEnd={() => setPlacementDrag(null)}
            />
          ),
        },
        objectsGroup,
        drawGroup,
        rollsGroup,
        {
          id: 'laser',
          label: 'Laser',
          icon: Pointer,
          onActivate: () => setPaintMode('laser'),
          content: <LaserPanel paintMode={paintMode} onPaintModeChange={setPaintMode} />,
        },
        {
          id: 'ruler',
          label: 'Measure',
          icon: Ruler,
          onActivate: () => setPaintMode('measure'),
          content: (
            <MeasurePanel
              paintMode={paintMode}
              rollBubbles={rollBubbles}
        diceThrows={diceThrows}
        measureShape={measureShape}
              feetPerCell={feetPerCell}
              gridShape={scene.grid.shape}
              measureUnit={scene.grid.measureUnit}
              milesPerCell={scene.grid.milesPerCell}
              onPaintModeChange={setPaintMode}
              onShapeChange={setMeasureShape}
              onFeetPerCellChange={setFeetPerCell}
            />
          ),
        },
      ];
    }

    return [
      selectGroup,
      {
        id: 'pieces',
        label: 'Pieces',
        icon: Users,
        content: (
          <RosterPanel
            roster={roster}
            tokens={tokens}
            busy={busy}
            placementDisabled={shownImageForViewport === 'background'}
            activeLayer={activeLayer}
            onPlaceCharacter={handlePlaceCharacter}
            onRemoveCharacter={handleRemoveCharacter}
            onAddToken={handleAddToken}
            onImportEncounter={() => setImportOpen(true)}
            onPlaceMonster={() => setMonsterOpen(true)}
            onPlacementDragStart={setPlacementDrag}
            onPlacementDragEnd={() => setPlacementDrag(null)}
          />
        ),
      },
      objectsGroup,
      drawGroup,
      rollsGroup,
      {
        id: 'laser',
        label: 'Laser',
        icon: Pointer,
        onActivate: () => setPaintMode('laser'),
        content: <LaserPanel paintMode={paintMode} onPaintModeChange={setPaintMode} />,
      },
      {
        id: 'ruler',
        label: 'Measure',
        icon: Ruler,
        onActivate: () => setPaintMode('measure'),
        content: (
          <MeasurePanel
            paintMode={paintMode}
            rollBubbles={rollBubbles}
        diceThrows={diceThrows}
        measureShape={measureShape}
            feetPerCell={feetPerCell}
            gridShape={scene.grid.shape}
            measureUnit={scene.grid.measureUnit}
            milesPerCell={scene.grid.milesPerCell}
            onPaintModeChange={setPaintMode}
            onShapeChange={setMeasureShape}
            onFeetPerCellChange={setFeetPerCell}
            // The scale of the map is the GM's to set: it travels with the
            // scene, so a player switching it would be switching everyone's
            // ruler.
            onMeasureUnitChange={(unit) => handleGridChange({ ...scene.grid, measureUnit: unit })}
            onMilesPerCellChange={(miles) => handleGridChange({ ...scene.grid, milesPerCell: miles })}
          />
        ),
      },
      {
        id: 'dungeon',
        label: 'Dungeon',
        icon: DoorOpen,
        content: (
          <DungeonPanel
            dungeonKey={dungeon.key}
            fights={dungeon.fights}
            busy={dungeon.busy}
            error={dungeon.error}
            linkHint={dungeon.linkHint}
            title={scene.name}
            partySize={Math.max(1, roster.length || 4)}
            onRoll={dungeon.roll}
            onClear={dungeon.clear}
            onSendRoom={dungeon.sendRoomToBuilder}
            monstersForRoom={dungeon.monstersForRoom}
            markersForRoom={dungeon.markersForRoom}
            onPlacementDragStart={setPlacementDrag}
            onPlacementDragEnd={() => setPlacementDrag(null)}
          />
        ),
      },
      {
        id: 'fog',
        label: 'Fog',
        icon: Cloud,
        onActivate: scene.fog ? () => setPaintMode('reveal') : undefined,
        content: (
          <FogPanel
            scene={scene}
            busy={busy}
            paintMode={paintMode}
            brushSize={brushSize}
            onEnableFog={handleEnableFog}
            onPaintModeChange={setPaintMode}
            onBrushSizeChange={setBrushSize}
            onFogAll={handleFogAll}
          />
        ),
      },
    ];
  }, [
    activeLayer, brushSize, busy, drawColor, drawWidth, erasable.length, handleAddMarker,
    handleAddToken, handleEnableFog, handleFitPlayArea, handleFogAll, handleGridChange,
    handlePlaceCharacter, handlePlaceObject, handlePlayAreaChange, handleRemoveCharacter,
    handleUndoDrawing, handleUploadMap,
    handleUploadBackground, handleShownImageChange, handleAddImage, paintMode,
    role.isGm, role.ownedCharacterIds, roster, scene, shownImageForViewport, tokens, measureShape, feetPerCell,
    rollFeed, handleCustomRoll, clearRollFeed, hexcrawl, dungeon,
  ]);

  // While editing one layer, strokes on the others fade back rather than
  // disappear: they are context, and losing them would make the map unreadable
  // the moment you switch tools.
  const visibleDrawings = useMemo(() => (
    spectator || gmPlayerPreview
      ? drawings.filter((drawing) => drawing.layer !== 'gm')
      : role.isGm
      ? drawings.map((drawing) => (
        drawing.layer === activeLayer ? drawing : { ...drawing, color: fade(drawing.color) }
      ))
      : drawings
  ), [activeLayer, drawings, gmPlayerPreview, role.isGm, spectator]);

  // The party's faces. Held by the browser after the first load, so a scene with
  // six characters in it does not go back to the bucket on every visit.
  const portraits = usePortraits(useMemo(
    () => roster.map((entry) => entry.portraitPath),
    [roster],
  ));

  const visibleTokens = useMemo(
    // Sheet hit points are overlaid at render, never copied onto the row: the
    // character sheet stays the one place a character's HP lives.
    () => withSheetVitals(resolveTokens(tokens, ghosts, draggingRef.current), roster)
      .map((token) => {
        // A monster's artwork is a file on the scene; a character's is their
        // portrait, which belongs to the sheet and follows it everywhere.
        const url = (token.portraitPath && portraits[token.portraitPath])
          || (token.imagePath && tokenImageUrls[token.imagePath])
          || null;
        return url ? { ...token, imageUrl: url } : token;
      }),
    [ghosts, portraits, roster, tokenImageUrls, tokens],
  );

  // A projector and the inline preview still have GM database permissions.
  // Recreate the player boundary explicitly before anything reaches their
  // viewport: no hidden layer, staging area, or secret label.
  const projectedTokens = useMemo(() => {
    if (!spectator && !gmPlayerPreview) return visibleTokens;
    return projectPlayerTokens(visibleTokens, scene.playArea);
  }, [gmPlayerPreview, scene.playArea, spectator, visibleTokens]);

  const projectedTokenById = useMemo(
    () => new Map(projectedTokens.map((token) => [token.id, token])),
    [projectedTokens],
  );
  const projectedRollBubbles = useMemo(() => (
    spectator || gmPlayerPreview
      ? rollBubbles
        .map((entry) => ({ ...entry, token: projectedTokenById.get(entry.token?.id) || null }))
        .filter((entry) => entry.token)
      : rollBubbles
  ), [gmPlayerPreview, projectedTokenById, rollBubbles, spectator]);
  const projectedDiceThrows = useMemo(() => (
    spectator || gmPlayerPreview
      ? diceThrows.map((entry) => ({
        ...entry,
        token: entry.token ? (projectedTokenById.get(entry.token.id) || null) : null,
      }))
      : diceThrows
  ), [diceThrows, gmPlayerPreview, projectedTokenById, spectator]);

  // The GM's hexcrawl hook contains their unrevealed planning cells. The
  // projector normally gets an RLS-filtered list; the inline preview needs to
  // reproduce that boundary locally because it keeps using the GM session.
  const projectedHexCells = useMemo(() => {
    if (!hexcrawl.visible) return null;
    if (!spectator && !gmPlayerPreview) return hexcrawl.cellsByKey;
    return new Map(
      [...hexcrawl.cellsByKey.entries()].filter(([, cell]) => cell?.revealed),
    );
  }, [gmPlayerPreview, hexcrawl.cellsByKey, hexcrawl.visible, spectator]);

  // The menu must edit the same character state the piece displays. The raw
  // map row deliberately has no sheet-owned HP or death saves, so using it here
  // made a dead character look like 0/0 and an innocent blur could write that
  // stale value back to the sheet.
  const menuToken = useMemo(
    () => visibleTokens.find((token) => token.id === menu?.tokenId) || null,
    [menu, visibleTokens],
  );

  const sheetChoices = useMemo(
    () => sheetChoicesForRole(roster, {
      isGm: role.isGm,
      ownedCharacterIds: role.ownedCharacterIds,
    }),
    [role.isGm, role.ownedCharacterIds, roster],
  );

  useEffect(() => {
    if (!sheetChoices.length) {
      setSheetCharacterId(null);
      setContentView('map');
      return;
    }
    if (!sheetChoices.some((entry) => entry.characterId === sheetCharacterId)) {
      setSheetCharacterId(sheetChoices[0].characterId);
    }
  }, [sheetCharacterId, sheetChoices]);

  // In fullscreen the viewport is the only subtree the browser paints. The
  // same sheet therefore moves into its draggable viewport window instead of
  // remaining mounted a second time in the hidden side column.
  const sideSheetOpen = contentView === 'sheet' && !mapFullscreen && !gmPlayerPreview;
  const selectSheetCharacter = useCallback((characterId) => {
    startSheetTransition(() => setSheetCharacterId(characterId));
  }, []);

  // The page is told as well, because its own top bar is fixed and painted above
  // the map. Where the browser has no Fullscreen API — a phone — "fullscreen" is
  // the map covering the window, and the bar stayed on top of it, over exactly
  // the corner controls that live at the top of the board.
  const handleMapFullscreenChange = useCallback((active) => {
    setMapFullscreen(active);
    onMapFullscreenChange?.(active);
  }, [onMapFullscreenChange]);

  const handleTogglePlayerPreview = useCallback(() => {
    if (!gmPlayerPreview) {
      // The preview is deliberately read-only. Reset every editing surface so
      // elevated GM writes cannot happen behind a player-looking board.
      setContentView('map');
      setPaintMode('select');
      setOpenCorner(null);
      setMenu(null);
      setPlacementDrag(null);
      setSelectedDrawingId(null);
      setImportOpen(false);
      setMonsterOpen(false);
    }
    setGmPlayerPreview((current) => !current);
  }, [gmPlayerPreview]);

  // Leaving the scene while covering the window must give the bar back, or the
  // page returns to a list with no way out of it. Through a ref, so a caller
  // passing a fresh function every render does not have the cleanup run — and
  // the bar come back mid-fullscreen — on every one of them.
  const mapFullscreenNoticeRef = useRef(onMapFullscreenChange);
  mapFullscreenNoticeRef.current = onMapFullscreenChange;
  useEffect(() => () => mapFullscreenNoticeRef.current?.(false), []);

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
    setProjectorControlsOpen(true);
  }, [notify, presenterCameraSource, scene.campaignId]);

  const stopProjector = useCallback(() => {
    setProjectorControlsOpen(false);
    const projector = projectorWindowRef.current;
    projectorWindowRef.current = null;
    try { projector?.close(); } catch (_) {}
  }, []);

  if (loading || role.loading) return <CircularProgress size={24} />;

  if (spectator) {
    return (
      <Box data-spectator-view sx={spectatorRootSx}>
        <SceneViewport
          scene={scene}
          imageUrl={viewportDisplay.url}
          preparedImageSize={viewportDisplay.imageSize}
          tokens={projectedTokens}
          snap
          canMove={() => false}
          fog={scene.fog}
          atmosphere={scene.atmosphere}
          fogOpacity={PLAYER_FOG_OPACITY}
          fogOnTop
          paintMode="select"
          backgroundOnly={viewportDisplay.shownImage === 'background'}
          // The projector shows the crawl as the table sees it: the country
          // they have been through, and the hex they are standing in.
          hexCells={projectedHexCells}
          partyHex={hexcrawl.partyHex}
          onImageSize={setImageSize}
          drawings={visibleDrawings}
          lasers={laserDots}
          rollBubbles={projectedRollBubbles}
          diceThrows={projectedDiceThrows}
          conditionEntries={conditionEntries}
          presentedInspection={projectorInspection}
          remoteMeasure={remoteMeasure}
          feetPerCell={feetPerCell}
          followView={followCameraPose}
          cameraLocked
          fillViewport
        />
      </Box>
    );
  }

  return (
    // Fills whatever the page gives it and passes the remainder down: the title
    // row takes the height it needs — one line or three, when a long campaign
    // name and the projector buttons wrap — and the map gets the rest. Nothing
    // here counts pixels, which is what stops the board being cut off or
    // floating above a strip of empty background.
    <Stack spacing={1} sx={editorRootSx}>
      <Box sx={sceneTopbarSx}>
        {role.isGm && !gmPlayerPreview && onOpenScene ? (
          <SceneSwitcher scene={scene} onOpenScene={onOpenScene} />
        ) : null}
        <Box sx={sceneIdentitySx}>
          <Typography variant="h1" sx={sceneTitleSx}>
            {sceneTitleFor(scene, {
              isGm: role.isGm && !gmPlayerPreview,
              campaignName: role.campaignName,
            })}
          </Typography>
          {role.isGm && !gmPlayerPreview ? (
            <Tooltip title="Rename scene">
              <IconButton size="small" aria-label="Rename scene" onClick={handleRename} sx={sceneRenameButtonSx}>
                <Pencil size={11} />
              </IconButton>
            </Tooltip>
          ) : null}
        </Box>
        {role.isGm ? (
          <Stack direction="row" spacing={0.75} useFlexGap sx={scenePresenterActionsSx}>
            {!gmPlayerPreview ? (
              <Button
                size="small"
                color={scene.isLive ? 'success' : 'inherit'}
                variant={scene.isLive ? 'contained' : 'outlined'}
                startIcon={<Radio size={14} />}
                aria-pressed={scene.isLive}
                onClick={handleToggleLive}
              >
                {scene.isLive ? 'Live' : 'Go live'}
              </Button>
            ) : null}
            <Tooltip title={gmPlayerPreview
              ? 'Return to the GM controls'
              : 'Preview exactly what players can see; editing is disabled'}>
              <Button
                size="small"
                variant={gmPlayerPreview ? 'contained' : 'outlined'}
                startIcon={gmPlayerPreview ? <EyeOff size={14} /> : <Eye size={14} />}
                aria-label={gmPlayerPreview ? 'Exit player view' : 'Player view'}
                aria-pressed={gmPlayerPreview}
                onClick={handleTogglePlayerPreview}
              >
                {gmPlayerPreview ? 'Exit player view' : 'Player view'}
              </Button>
            </Tooltip>
            {/* One public-view lock for the whole table. Players are held on the
                persisted picture; an open projector also holds its camera. */}
            {!gmPlayerPreview && scene.isLive ? (
              <Tooltip
                title={projectorFollowing
                  ? 'Freeze the current picture for players and the projector while you prepare another view'
                  : 'Publish your prepared picture and let the projector follow your camera again'}
              >
                <Button
                  size="small"
                  variant={projectorFollowing ? 'outlined' : 'contained'}
                  startIcon={projectorFollowing ? <Lock size={14} /> : <LockOpen size={14} />}
                  aria-label={projectorFollowing ? 'Freeze view' : 'Unfreeze view'}
                  aria-pressed={!projectorFollowing}
                  onClick={handleToggleProjectorFollow}
                >
                  {projectorFollowing ? 'Freeze view' : 'Unfreeze view'}
                </Button>
              </Tooltip>
            ) : null}
            {/* A scene that is not live has no projector to point anywhere, and
                a projector already running only needs stopping and freezing. */}
            {!gmPlayerPreview && scene.isLive && !projectorControlsOpen ? (
              <Button
                size="small"
                variant="outlined"
                startIcon={<MonitorPlay size={14} />}
                onClick={openSpectator}
              >
                Projector mode
              </Button>
            ) : null}
            {!gmPlayerPreview && scene.isLive && projectorControlsOpen ? (
              <Tooltip title="Closes the projector tab">
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<MonitorOff size={14} />}
                  onClick={stopProjector}
                >
                  Stop projector mode
                </Button>
              </Tooltip>
            ) : null}
          </Stack>
        ) : null}
        {!gmPlayerPreview ? (
          <Box sx={sceneViewSwitchSx}>
            <BattleMapViewSwitch
              view={contentView}
              choices={sheetChoices}
              selectedId={sheetCharacterId}
              onViewChange={setContentView}
              onSelectionChange={selectSheetCharacter}
            />
          </Box>
        ) : null}
      </Box>

      <Box
        ref={contentLayoutRef}
        style={sideSheetOpen ? { '--sheet-grid-columns': sheetGridColumns(sheetSplit) } : undefined}
        sx={[contentLayoutSx, sideSheetOpen && contentLayoutOpenSx]}
      >
        <Box sx={[viewportCellSx, sideSheetOpen && viewportCellStackedSx]}>
          <SceneViewport
        scene={scene}
        imageUrl={viewportDisplay.url}
        preparedImageSize={viewportDisplay.imageSize}
        tokens={gmPlayerPreview ? projectedTokens : visibleTokens}
        snap
        canMove={gmPlayerPreview ? () => false : canMove}
        fog={scene.fog}
        atmosphere={scene.atmosphere}
        fogOpacity={role.isGm && !gmPlayerPreview ? GM_FOG_OPACITY : PLAYER_FOG_OPACITY}
        fogOnTop={!role.isGm || gmPlayerPreview}
        // Fog brushes are the GM's; drawing is everyone's, so a player keeps
        // the pencil and the eraser and loses only reveal/hide.
        paintMode={gmPlayerPreview ? 'select' : allowedPaintMode}
        brushSize={brushSize}
        activeLayer={role.isGm && !gmPlayerPreview ? activeLayer : null}
        showPlayArea={role.isGm && !gmPlayerPreview}
        backgroundOnly={viewportDisplay.shownImage === 'background'}
        // Top left: which picture is up is constant state, like the layer in the
        // opposite corner, and switching it is a move you make mid-scene.
        imageSwitch={role.isGm && !gmPlayerPreview
          ? (
            <Stack direction="row" spacing={0.75} sx={{ alignItems: 'flex-start' }}>
              <MapCorner
                scene={{ ...scene, shownImage: shownImageForViewport }}
                busy={busy}
                open={openCorner === 'pictures'}
                onOpenChange={(next) => setOpenCorner(next ? 'pictures' : null)}
                onShownImageChange={handleShownImageChange}
                onUploadMap={handleUploadMap}
                onUploadBackground={handleUploadBackground}
                onRemoveMap={handleRemoveMap}
                onRemoveBackground={handleRemoveBackground}
                onAddImage={handleAddImage}
                onGridChange={handleGridChange}
                onAtmosphereChange={handleAtmosphereChange}
                onPlayAreaChange={handlePlayAreaChange}
                onFitPlayArea={handleFitPlayArea}
              />
              {hexcrawl.enabled ? (
                <HexcrawlCorner
                  open={openCorner === 'hexcrawl'}
                  onOpenChange={(next) => setOpenCorner(next ? 'hexcrawl' : null)}
                  board={hexcrawl.board}
                  clock={hexcrawl.clock}
                  clockLinked={hexcrawl.clockLinked}
                  defaults={hexcrawl.defaults}
                  armed={hexcrawl.armed}
                  busy={hexcrawl.busy}
                  error={hexcrawl.error}
                  lastHex={hexcrawl.lastHex}
                  hasResult={hexcrawl.hasResult}
                  onOpenResult={hexcrawl.openResult}
                  hexColor={scene.grid.hexColor}
                  onHexColorChange={(hexColor) => handleGridChange({ ...scene.grid, hexColor })}
                  onDefaultsChange={hexcrawl.setDefaults}
                  onSeasonChange={hexcrawl.setSeason}
                  onArmedChange={hexcrawl.setArmed}
                />
              ) : null}
            </Stack>
          )
          : null}
        // Painted for everyone at the table; only the GM may click one.
        hexCells={projectedHexCells}
        partyHex={hexcrawl.partyHex}
        selectedHex={gmPlayerPreview ? null : hexcrawl.selected}
        onHexClick={!gmPlayerPreview && hexcrawl.enabled ? hexcrawl.clickHex : undefined}
        hexBubble={!gmPlayerPreview && hexcrawl.enabled ? hexcrawl.bubble : null}
        onHexBubbleOpen={!gmPlayerPreview ? hexcrawl.openResult : undefined}
        onImageSize={setImageSize}
        onDragToken={gmPlayerPreview ? undefined : handleDragToken}
        onMoveToken={gmPlayerPreview ? undefined : handleMoveToken}
        onMoveTokens={gmPlayerPreview ? undefined : handleMoveTokens}
        onDeleteTokens={gmPlayerPreview ? undefined : handleDeleteTokens}
        onResizeToken={gmPlayerPreview ? undefined : handleMoveToken}
        onRotateToken={gmPlayerPreview ? undefined : handleMoveToken}
        canSetDeathSaves={gmPlayerPreview ? () => false : (token) => role.isGm || canMove(token)}
        onDeathSaveChange={gmPlayerPreview ? undefined : handleDeathSaveChange}
        onPaint={gmPlayerPreview ? undefined : handlePaint}
        onPaintEnd={gmPlayerPreview ? undefined : handlePaintEnd}
        onContextMenu={gmPlayerPreview ? undefined : (token, at) => setMenu({ tokenId: token.id, at })}
        onDropCharacter={gmPlayerPreview ? undefined : handleDropCharacter}
        placementDrag={gmPlayerPreview ? null : placementDrag}
        onDropPlacement={gmPlayerPreview ? undefined : handleDropPlacement}
        drawings={visibleDrawings}
        movableDrawing={gmPlayerPreview ? null : movableDrawing}
        selectedDrawingId={gmPlayerPreview ? null : selectedDrawingId}
        onSelectDrawing={gmPlayerPreview ? undefined : setSelectedDrawingId}
        onMoveDrawing={gmPlayerPreview ? undefined : handleMoveDrawing}
        drawColor={drawColor}
        drawWidth={drawWidth}
        onDrawEnd={gmPlayerPreview ? undefined : handleDrawEnd}
        onErase={gmPlayerPreview ? undefined : handleErase}
        onWriteNote={gmPlayerPreview ? undefined : handleWriteNote}
        onLaser={gmPlayerPreview ? undefined : handleLaser}
        lasers={laserDots}
        rollBubbles={gmPlayerPreview ? projectedRollBubbles : rollBubbles}
        diceThrows={gmPlayerPreview ? projectedDiceThrows : diceThrows}
        measureShape={measureShape}
        feetPerCellForRuler={feetPerCell}
        conditionEntries={conditionEntries}
        onTokenInspection={role.isGm && !gmPlayerPreview ? handleTokenInspection : undefined}
        onMeasure={gmPlayerPreview ? undefined : handleMeasure}
        remoteMeasure={remoteMeasure}
        feetPerCell={feetPerCell}
        controls={gmPlayerPreview ? null : (
          <SceneToolRail
            groups={toolGroups}
            activeId={paintToolGroup(allowedPaintMode)}
            onCursor={() => setPaintMode('select')}
            placing={Boolean(placementDrag)}
          />
        )}
        // Inside the viewport, not beside it: a fullscreen map paints nothing
        // that is not one of its own descendants.
        toast={<DiceToast toast={rollToast} onClose={dismissRollToast} />}
        onFullscreenChange={handleMapFullscreenChange}
        onViewChange={role.isGm && !gmPlayerPreview ? handleCameraViewChange : undefined}
        fullscreenSheet={!gmPlayerPreview && sheetChoices.length ? {
          choices: sheetChoices,
          selectedId: sheetCharacterId,
          onSelectionChange: selectSheetCharacter,
          content: sheetCharacterId ? (
            <EmbeddedBattleMapSheet
              key={`floating:${sheetCharacterId}`}
              characterId={sheetCharacterId}
              onRoll={handleSheetRoll}
            />
          ) : null,
        } : null}
        // Bottom left, opposite the fullscreen button: the layer you are editing
        // is a constant piece of state, not a setting you go and find.
        layerSwitch={role.isGm && !gmPlayerPreview
          ? <LayerPanel compact activeLayer={activeLayer} onActiveLayerChange={setActiveLayer} />
          : null}
          />
        </Box>
        {sideSheetOpen ? (
          <>
            <BattleMapSheetResizeHandle
              containerRef={contentLayoutRef}
              value={sheetSplit}
              onCommit={commitSheetSplit}
            />
            <Box sx={sheetViewSx}>
              {sheetCharacterId ? (
                <EmbeddedBattleMapSheet
                  key={`side:${sheetCharacterId}`}
                  characterId={sheetCharacterId}
                  onRoll={handleSheetRoll}
                />
              ) : null}
            </Box>
          </>
        ) : null}
      </Box>

      {/* What the party walked into, as the answer to the click that took them
          there. */}
      <HexResultDialog
        result={gmPlayerPreview ? null : hexcrawl.result}
        onClose={hexcrawl.dismissResult}
      />

      <MonsterPickerDialog
        open={monsterOpen}
        busy={busy}
        placing={Boolean(placementDrag)}
        onClose={() => setMonsterOpen(false)}
        onPlace={handlePlaceMonster}
        onPlacementDragStart={setPlacementDrag}
        onPlacementDragEnd={() => setPlacementDrag(null)}
      />

      <EncounterImportDialog
        open={importOpen}
        busy={busy}
        placing={Boolean(placementDrag)}
        onClose={() => setImportOpen(false)}
        onImport={handleImportEncounter}
        onPlacementDragStart={setPlacementDrag}
        onPlacementDragEnd={() => setPlacementDrag(null)}
      />

      {!gmPlayerPreview ? <TokenMenu
        token={menuToken}
        anchor={menu?.at || null}
        canEdit={role.isGm}
        canMark={canMarkToken(menuToken, {
          isGm: role.isGm,
          ownedCharacterIds: role.ownedCharacterIds,
        })}
        canShowHp={role.isGm || canMove(menuToken)}
        // Advantage and the rest are marks like conditions, and answer to the
        // same question: anyone at the table may put one on a creature, nobody
        // may put one on somebody else's character.
        canSetEffects={canMarkToken(menuToken, {
          isGm: role.isGm,
          ownedCharacterIds: role.ownedCharacterIds,
        })}
        canSetDeathSaves={role.isGm || canMove(menuToken)}
        canStyleObject={Boolean(menuToken?.iconKey) && (role.isGm || canMove(menuToken))}
        canRemove={role.isGm || canMove(menuToken)}
        onClose={() => setMenu(null)}
        onSave={role.isGm ? handleSaveToken : handleMarkToken}
        onObjectStyle={handleObjectStyle}
        onVisibility={role.isGm ? handleTokenVisibility : undefined}
        onDelete={handleDeleteToken}
      /> : null}

      {gmPlayerPreview ? (
        <Typography variant="caption" color="text.secondary">
          Player view is read-only and hides GM-only content, staged pieces, and unrevealed fog.
        </Typography>
      ) : !role.isGm ? (
        <Typography variant="caption" color="text.secondary">
          You can move the pieces standing for your own characters.
        </Typography>
      ) : null}
    </Stack>
  );
}

const EmbeddedBattleMapSheet = memo(function EmbeddedBattleMapSheet({ characterId, onRoll }) {
  return (
    <Suspense fallback={<Box sx={sheetLoadingSx}><CircularProgress size={26} /></Box>}>
      <CampaignSheetView
        sheetId={characterId}
        editable
        embedded
        onRoll={onRoll}
        showOwnRollToast={false}
      />
    </Suspense>
  );
});
