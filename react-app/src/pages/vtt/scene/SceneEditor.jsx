import {
  lazy, memo, Suspense, useCallback, useEffect, useMemo, useRef, useState, useTransition,
} from 'react';
import {
  Box, Button, CircularProgress, IconButton, Stack, Tooltip, Typography,
} from '@mui/material';
import {
  Eye,
  EyeOff,
  Pencil,
} from 'lucide-react';
import { useToast } from '../../../shared/ui/ToastProvider.jsx';
import { useAuth } from '../../../shared/cloud/auth/AuthProvider.jsx';
import { withSheetVitals } from '../../../shared/campaign/roster.js';
import { usePortraits } from '../../../shared/character/profile/usePortraits.js';
import { commandCharacterVitals } from '../../../shared/cloud/api/cloudCharacters.js';
import {
  clearLiveScene,
  fetchScene,
  fetchSceneRevision,
  setLiveScene,
  setTokenVisibility,
  signMapImage,
  updateScene,
  updateToken,
} from '../../../shared/cloud/api/vtt.js';
import {
  applyCommittedToken,
  applyTokenEvent,
  dropGhost,
  movableFilter,
  pruneGhosts,
  putGhost,
  settleGhost,
  resolveTokens,
} from '../../../shared/vtt/session/liveScene.js';
import {
  DEFAULT_FOG_SCALE,
  applyCells,
  applyFogDelta,
  createFog,
  fogDelta,
  fogSizeForImage,
  hideAll,
  normalizeFog,
  revealAll,
  sameFog,
} from '../../../shared/vtt/map/fog.js';
import { REMOTE_MEASURE_TTL_MS } from '../../../shared/vtt/map/measureSync.js';
import { acceptFogDelta, newFogStroke } from '../../../shared/vtt/map/fogStream.js';
import {
  canMarkToken,
  isTokenVisibleToPlayers,
  normalizePlayArea,
  sceneBackgrounds,
  sceneTitleFor,
  sceneView,
  toScene,
  viewBackgroundPath,
  viewImagePath,
  viewPatch,
  samePlayArea,
} from '../../../shared/vtt/scene/scene.js';
import { DEFAULT_AREA_OPTIONS } from '../../../shared/vtt/map/areas.js';
import { FEET_PER_CELL } from '../../../shared/vtt/map/measure.js';
import { VTT_COLORS } from '../../../shared/vtt/colors.js';
import { isHexGrid } from '../../../shared/vtt/map/hexGeometry.js';
import { playAreaForImage } from '../../../shared/vtt/map/geometry.js';
import { useSceneLive } from '../../../shared/vtt/session/useSceneLive.js';
import { useSceneRole } from '../../../shared/vtt/session/useSceneRole.js';
import { createCameraSourceId } from '../../../shared/vtt/session/cameraSync.js';
import {
  projectPlayerTokens, shouldApplyPresenterFrame, spectatorUrl,
} from '../../../shared/vtt/session/spectator.js';
import { createProjectorLink, isWindowOpen } from '../../../shared/vtt/session/projectorLink.js';
import { sheetChoicesForRole } from '../../../shared/vtt/sheets/sheetView.js';
import {
  DEFAULT_SHEET_SPLIT,
  readSheetSplit,
  sheetGridColumns,
  writeSheetSplit,
} from '../../../shared/vtt/sheets/sheetLayout.js';
import { useGmTokenVitals } from '../tokens/useGmTokenVitals.js';
import { useSceneHexcrawl } from '../hexcrawl/useSceneHexcrawl.js';
import { useSceneTurns } from '../initiative/useSceneTurns.js';
import InitiativeStrip, { InitiativeButton } from '../initiative/InitiativeStrip.jsx';
import MonsterStatBlockView from '../tokens/MonsterStatBlockView.jsx';
import { useSceneDungeon } from '../dungeon/useSceneDungeon.js';
import { useSceneContent } from './useSceneContent.js';
import { useCampaignRoster } from './useCampaignRoster.js';
import { useVttRolls } from '../rolls/useVttRolls.js';
import { useMonsterDb } from '../../encounterbuilder/bestiary/useMonsterDb.js';
import { parseSourceRef } from '../../../shared/vtt/tokens/encounterSync.js';
import {
  showsFight,
} from '../../../shared/vtt/tokens/initiative.js';
import HexcrawlCorner from '../hexcrawl/HexcrawlCorner.jsx';
import HexResultDialog from '../hexcrawl/HexResultDialog.jsx';
import { useConditionEntries } from '../../encounterbuilder/combat/useConditionEntries.js';
import EncounterImportDialog from '../tokens/EncounterImportDialog.jsx';
import MonsterPickerDialog from '../tokens/MonsterPickerDialog.jsx';
import DiceToast from '../../../shared/character/dice/DiceToast.jsx';
import RollsButton from '../rolls/RollsButton.jsx';
import SceneSwitcher from './SceneSwitcher.jsx';
import SceneToolRail from './SceneToolRail.jsx';
import MapCorner from './MapCorner.jsx';
import BackgroundStrip from './BackgroundStrip.jsx';
import BattleMapViewSwitch from '../map/BattleMapViewSwitch.jsx';
import LiveControls from './LiveControls.jsx';
import BattleMapSheetResizeHandle from '../sheets/BattleMapSheetResizeHandle.jsx';
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
  sceneGmControlsSx,
  sceneControlsPassThroughSx,
  scenePlayerViewSwitchSx,
  viewButtonSx,
  sheetLoadingSx,
  sheetViewSx,
  spectatorRootSx,
  viewportCellSx,
} from './sceneEditorStyles.js';
import {
  CursorPanel,
  LayerPanel,
} from './ScenePanels.jsx';
import SceneViewport from '../map/SceneViewport.jsx';
import TokenMenu from '../tokens/TokenMenu.jsx';
import DrawingMenu from '../map/DrawingMenu.jsx';
import { buildToolGroups } from './sceneToolGroups.jsx';
import { useSceneDrawings } from '../map/useSceneDrawings.js';
import { useTokenPlacement } from '../tokens/useTokenPlacement.js';
import { useTokenEdits } from '../tokens/useTokenEdits.js';
import { useSceneInitiative } from '../initiative/useSceneInitiative.js';
import { useSceneSettings } from './useSceneSettings.js';
import { useSceneImages } from './useSceneImages.js';

const CampaignSheetView = lazy(() => import('../../campaignsheet/CampaignSheetView.jsx'));

const GHOST_SWEEP_MS = 2000;
// A piece held still under the pointer sends no frames, and the other screens
// would sweep its ghost away and show it back where it started. The last frame
// is sent again this often, well inside GHOST_TTL_MS.
const DRAG_KEEPALIVE_MS = 1500;
const LASER_TTL_MS = 2500;
// How long an open projector in this browser has to say it is there.
const PROJECTOR_ANSWER_MS = 400;
const FOG_BROADCAST_MS = 80;
// The GM needs to see what is still hidden from the party without being blind
// to the map underneath; a player gets the real thing.
const GM_FOG_OPACITY = 0.55;
const PLAYER_FOG_OPACITY = 1;
// Only used before the map image has loaded, or when the scene has none yet.
const DEFAULT_MAP_CELLS = { cols: 40, rows: 30 };


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
  if (mode === 'marquee') return 'cursor';
  if (['draw', 'erase', 'text', 'area'].includes(mode)) return 'draw';
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
  projectorWindowRef: presenterWindowRef = null,
}) {
  const { notify } = useToast();
  const { user } = useAuth();
  const role = useSceneRole(scene.campaignId);
  const {
    beginDrawingWrite,
    beginTokenMove,
    movingTokenIds,
    drawings,
    handleDrawingEvent,
    loading,
    reconcileContent,
    refreshVisibleTokens,
    setDrawings,
    setTokens,
    tokenImageUrls,
    tokens,
  } = useSceneContent({ scene, isGm: role.isGm, spectator, notify });
  const { roster, digests: rosterDigests, baseMax: rosterBaseMax } = useCampaignRoster(scene.campaignId);
  // What a character health command starts from: the digest the map follows
  // and the base max HP derived for its basis (commandCharacterVitals).
  const rosterVitalsRef = useRef(null);
  rosterVitalsRef.current = { digests: rosterDigests, baseMax: rosterBaseMax };
  const characterHealth = useCallback((characterId, command) => {
    const id = String(characterId);
    const { digests, baseMax } = rosterVitalsRef.current;
    return commandCharacterVitals(characterId, command, { digest: digests.get(id) ?? null, base: baseMax.get(id) ?? null });
  }, []);
  // Public rows carry hit points only while a bar is shown; the GM reads the
  // real ones from the private sources and sees them overlaid at render.
  const gmVitals = useGmTokenVitals({ sceneId: scene.id, tokens, enabled: role.isGm && !spectator });
  // Which fight the scene shows as its initiative. The turn itself is that
  // fight's; players see it through the pieces (turn_order / turn_active).
  const sceneTurns = useSceneTurns({ sceneId: scene.id, isGm: role.isGm && !spectator });
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
    path: viewImagePath(scene, sceneView(scene)),
    shownImage: scene.shownImage,
  }));
  const [busy, setBusy] = useState(false);
  // A picture that failed to sign or decode leaves this client on the previous
  // frame, and the scene row it would re-read is already correct — so nothing
  // reruns the load on its own. The reconciliation that already repairs the
  // rest of the scene bumps this instead, which is the one dependency the
  // loader needs to try again.
  const [imageAttempt, setImageAttempt] = useState(0);
  const imageOnScreenRef = useRef(false);
  // The version of the scene row last seen from the server; the recovery poll
  // reads the whole row (fog included) only when the database has moved on.
  const sceneUpdatedAtRef = useRef(scene.updatedAt);
  sceneUpdatedAtRef.current = scene.updatedAt;
  const imageLoadingRef = useRef(false);
  const draggingRef = useRef(null);
  // The last drag frame sent to the table, repeated while the piece is held.
  const dragFrameRef = useRef(null);
  // Scene fields this screen has changed and not finished writing (grid,
  // atmosphere, play area), each with the token of its latest change. One
  // shared flag was cleared by the first write to finish while a later change
  // was still waiting: picking a second atmosphere then let the echo of the
  // first one in, and the screen went new, old, new.
  const sceneEditsRef = useRef(new Map());
  const beginSceneEdit = useCallback((field) => {
    const token = {};
    sceneEditsRef.current.set(field, token);
    return () => {
      if (sceneEditsRef.current.get(field) === token) sceneEditsRef.current.delete(field);
    };
  }, []);
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
    if (!next || sceneEditsRef.current.size || paintingRef.current) return false;
    if (!next.updatedAt) return true;
    const saved = savedRevisionRef.current;
    const floor = Math.max(
      sceneUpdatedAtRef.current || 0,
      saved.sceneId === next.id ? saved.updatedAt : 0,
    );
    return next.updatedAt >= floor;
  }, []);
  const paintingRef = useRef(false);
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
  // Receiving side: where each remote painter's stroke has got to.
  const remoteFogStreamsRef = useRef(new Map());
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
  // The next area of effect to place. Kept between placements, so a row of
  // fire is a row of clicks.
  const [areaOptions, setAreaOptions] = useState(DEFAULT_AREA_OPTIONS);
  const [contentView, setContentView] = useState('map');
  const [mapFullscreen, setMapFullscreen] = useState(false);
  // A local audit mode for the GM. The account keeps GM permissions, while the
  // viewport receives only the same player-safe projection as the projector.
  const [playerPreviewRequested, setGmPlayerPreview] = useState(false);
  const gmPlayerPreview = role.isGm && playerPreviewRequested;
  const [sheetCharacterId, setSheetCharacterId] = useState(null);
  // The floating sheet of a fullscreen board, held here so a creature clicked
  // on that board can open its stat block in it.
  const [floatingSheetOpen, setFloatingSheetOpen] = useState(false);
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
    dismissRollBubble,
    dismissToast: dismissRollToast,
    feed: rollFeed,
    handleCreatureRoll,
    handleCustomRoll,
    handleSheetRoll,
    rollBubbles,
    toast: rollToast,
  } = useVttRolls({ campaignId: scene.campaignId, role, roster, tokens });

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

  // Whichever picture this client is looking at: the battlemap or one of the
  // backgrounds. The others stay uploaded and one click away.
  const viewForViewport = spectator
    ? projectorView
    : role.isGm && !gmPlayerPreview ? gmView : sceneView(scene);
  const shownImageForViewport = viewForViewport.shownImage;
  // Resolved against the scene's list: a view pointing at a background removed
  // since falls back instead of going blank.
  const backgroundForViewport = viewBackgroundPath(scene, viewForViewport);
  const shownPath = viewImagePath(scene, viewForViewport);
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
  // Read by the reconciliation below, which runs outside rendering. Matching
  // path and mode is not enough: the initial state already carries those with
  // no URL behind them, which is exactly the empty frame to repair.
  imageOnScreenRef.current = displayIsTarget && (!shownPathOrNull || Boolean(displayed.url));

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

    imageLoadingRef.current = true;
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
      })
      .finally(() => { if (!cancelled) imageLoadingRef.current = false; });
    return () => {
      cancelled = true;
      imageLoadingRef.current = false;
    };
  }, [scene.id, shownImageForViewport, shownPath, imageAttempt]);

  useEffect(() => {
    if (!role.isGm) setGmPlayerPreview(false);
  }, [role.isGm]);

  const handleTokenEvent = useCallback((payload) => {
    setTokens((current) => applyTokenEvent(current, payload, {
      draggingId: draggingRef.current,
      pendingIds: movingTokenIds(),
    }));
    const id = payload?.new?.id || payload?.old?.id;
    // The row the drop wrote supersedes the drag preview once the drag is over;
    // a removed piece takes its ghost with it at once.
    const removed = String(payload?.eventType || payload?.type || '').toUpperCase() === 'DELETE';
    if (id) {
      setGhosts((current) => (removed ? dropGhost(current, id) : settleGhost(current, id, payload?.new)));
    }
  }, [movingTokenIds]);

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

    // A live painting frame: only the cells it flipped. Applied in order; a
    // gap waits for the stroke's final snapshot instead of guessing.
    if (payload.fogDelta) {
      if (paintingRef.current) return;
      if (!acceptFogDelta(remoteFogStreamsRef.current, payload.actor, payload.fogDelta)) return;
      onSceneChange((current) => {
        const fog = applyFogDelta(current.fog, payload.fogDelta);
        return fog && fog !== current.fog ? { ...current, fog } : current;
      });
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
      // Stamped on arrival: the sweep below drops a ruler whose owner stopped
      // refreshing it (a closed tab never sends its release).
      setRemoteMeasure(payload.measure ? { ...payload.measure, receivedAt: Date.now() } : null);
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
  }, [onSceneChange, reconcileContent, refreshVisibleTokens]);

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
  // Runs every 30 seconds on every device at the table, so it asks for
  // versions first and reads a row (the scene with its fog, a piece, a mark, a
  // fight) only when that version moved.
  const reconcilePersistentState = useCallback(async () => {
    // The picture is part of the scene as much as the row is. A load that
    // failed earlier is not visible in the data, so repair it here too —
    // unless one is still running, whose download this would only restart.
    if (!imageOnScreenRef.current && !imageLoadingRef.current) {
      setImageAttempt((attempt) => attempt + 1);
    }
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
  }, [acceptsScene, gmVitals, onSceneChange, reconcileContent, scene.id, sceneTurns]);
  const {
    sendDrag, sendCamera, sendPresenterState, sendPresenterInspection,
  } = useSceneLive({
    sceneId: scene.id,
    onTokenEvent: handleTokenEvent,
    onSceneEvent: handleSceneEvent,
    onRemoteDrag: handleRemoteDrag,
    onDrawingEvent: handleDrawingEvent,
    onTurnsEvent: sceneTurns.handleEvent,
    cameraSourceId: role.isGm && !spectator ? presenterCameraSource : null,
    cameraFollowers: projectorControlsOpen,
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

  // A client that vanishes mid-drag never sends its release; sweeping keeps its
  // piece from being pinned at the ghost position forever.
  useEffect(() => {
    const timer = setInterval(() => {
      setGhosts((current) => pruneGhosts(current));
      setRemoteMeasure((current) => (
        current && Date.now() - current.receivedAt > REMOTE_MEASURE_TTL_MS ? null : current
      ));
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
    const { released, ...place } = position;
    const moving = { ...token, ...place };
    const shown = isTokenVisibleToPlayers(moving, scene.playArea);
    // Put back where it was picked up: nothing to write, but the other screens
    // let go of the drag and this one listens to the piece's row again.
    if (released) {
      if (draggingRef.current === token.id) draggingRef.current = null;
      dragFrameRef.current = null;
      if (shown) sendDrag({ id: token.id, x: place.x, y: place.y, released: true });
      return;
    }
    draggingRef.current = token.id;
    if (shown) {
      dragFrameRef.current = { id: token.id, x: place.x, y: place.y, at: Date.now() };
      sendDrag({ id: token.id, x: place.x, y: place.y });
    }
  }, [scene.playArea, sendDrag]);

  useEffect(() => {
    const timer = setInterval(() => {
      const frame = dragFrameRef.current;
      if (!frame || draggingRef.current !== frame.id) return;
      if (Date.now() - frame.at < DRAG_KEEPALIVE_MS) return;
      frame.at = Date.now();
      sendDrag({ id: frame.id, x: frame.x, y: frame.y });
    }, DRAG_KEEPALIVE_MS / 2);
    return () => clearInterval(timer);
  }, [sendDrag]);

  const handleMoveToken = useCallback(async (token, position) => {
    const finishMove = beginTokenMove([token.id]);
    const wasVisible = isTokenVisibleToPlayers(token, scene.playArea);
    const willBeVisible = isTokenVisibleToPlayers({ ...token, ...position }, scene.playArea);
    setTokens((current) => current.map((item) => (
      item.id === token.id ? { ...item, ...position } : item
    )));
    dragFrameRef.current = null;
    // Let go where it landed, before the write: other screens keep showing
    // the drag until then, and only then take the row that comes back. A turn
    // or a resize has no place to land on and no drag to let go of.
    const placed = Number.isFinite(position?.x) && Number.isFinite(position?.y);
    if (placed && willBeVisible) sendDrag({ id: token.id, x: position.x, y: position.y, released: true });
    let committed = null;
    try {
      committed = await updateToken(token.id, position);
      if (wasVisible !== willBeVisible) sendDrag({ tokensChanged: true });
    } catch (cause) {
      setTokens((current) => current.map((item) => (item.id === token.id ? token : item)));
      notify('error', cause?.message || 'Could not move that token.');
    } finally {
      // Released only after the write settles: until then a remote echo would
      // still be our own move coming back.
      draggingRef.current = null;
      const settled = finishMove();
      // The last move of this piece to come back answers for it: its echoes
      // were held back while moves were in flight.
      if (committed && settled.includes(token.id)) {
        setTokens((current) => applyCommittedToken(current, committed));
      }
    }
  }, [beginTokenMove, notify, scene.playArea, sendDrag]);

  const handleMoveTokens = useCallback(async (moves) => {
    const valid = (moves || []).filter(({ token, position }) => (
      token?.id && canMove(token) && Number.isFinite(position?.x) && Number.isFinite(position?.y)
    ));
    if (!valid.length) return;

    const finishMove = beginTokenMove(valid.map(({ token }) => token.id));
    const byId = new Map(valid.map(({ token, position }) => [token.id, { token, position }]));
    setTokens((current) => current.map((item) => {
      const move = byId.get(item.id);
      return move ? { ...item, ...move.position } : item;
    }));

    const results = await Promise.allSettled(
      valid.map(({ token, position }) => updateToken(token.id, position)),
    );
    const settled = new Set(finishMove());
    // As for a single move: rows whose last write this was come in whole.
    const committedRows = results.flatMap((result) => (
      result.status === 'fulfilled' && result.value && settled.has(result.value.id) ? [result.value] : []
    ));
    if (committedRows.length) {
      setTokens((current) => committedRows.reduce(applyCommittedToken, current));
    }
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
  }, [beginTokenMove, canMove, notify, scene.playArea, sendDrag]);

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
      // Not taken whole: the row knows nothing of the GM-only label, which
      // lives apart from it, and the piece lost its name until a reload.
      setTokens((current) => applyCommittedToken(current, updated));
      sendDrag({ tokensChanged: true });
    } catch (cause) {
      setTokens((current) => current.map((item) => (item.id === token.id ? token : item)));
      notify('error', cause?.message || 'Could not change who can see that piece.');
    }
  }, [notify, sendDrag]);

  const {
    savePlayArea, handleGridChange, handleAtmosphereChange, handleImageFilterChange,
    viewportImageFilter, viewportAtmosphere,
  } = useSceneSettings({
    scene, onSceneChange, role, spectator, notify, beginSceneEdit, noteSceneWrite,
    imageSize, shownImageForViewport, viewportDisplay, sendDrag,
  });

  // Painting mirrors the token drag: every stroke frame goes out on broadcast,
  // and the database sees one write when the brush lifts.
  //
  // The next fog is worked out from `fogRef` before any state is set: state
  // updaters stay pure (React may run them twice), and a stroke over cells
  // already in the wanted state sends and stores nothing at all.
  //
  // Live frames carry only the cells flipped since the previous frame, not the
  // whole bitset; the full fog goes out once, when the brush lifts.
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

  // The stroke is drawn locally as it happens; this is the single write when the
  // pen lifts, and it goes to its own row so undo is a delete.
  const {
    handleDrawEnd, removeDrawing, erasable, handleErase, movableDrawing, handleMoveDrawing,
    handlePlaceArea, drawingMenu, setDrawingMenu, menuDrawing, drawingForMenu,
    handlePreviewDrawing, handleSaveDrawing, handleDrawingVisibility,
    handleAreaOptionsChange, handleWriteNote, handleMeasure, handleLaser, handleUndoDrawing,
  } = useSceneDrawings({
    scene, role, user, notify, activeLayer, drawColor, drawWidth, setDrawColor,
    setAreaOptions, drawings, setDrawings, beginDrawingWrite, reconcileContent, sendDrag,
    setLasers,
  });

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

  const {
    handleUploadMap, handleRemoveMap, handleUploadBackground, handleRemoveBackground,
    handleShownImageChange, handleSelectBackground,
  } = useSceneImages({
    scene, onSceneChange, role, notify, setBusy, noteSceneWrite, setGmView,
    projectorFollowingRef, backgroundForViewport,
  });

  const {
    viewCenterRef, handleAddImage, handlePlaceCharacter, handleDropCharacter,
    handlePlaceMonster, handleAddToken, handlePlaceObject, handleImportEncounter,
    handleDropPlacement,
  } = useTokenPlacement({
    scene, role, notify, activeLayer, tokens, setTokens, roster, monsterDb, dungeon,
    setBusy, setImportOpen, setPlacementDrag, shownImageForViewport,
  });

  const {
    handleMarkToken, handleSaveToken, handleTokenVitals, handleDeathSaveChange,
    handleDeleteToken, handleDeleteTokens, handleRemoveCharacter,
  } = useTokenEdits({
    role, notify, tokens, setTokens, canMove, characterHealth, gmVitals,
    refreshVisibleTokens, setBusy,
  });

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
  const toolGroups = useMemo(() => buildToolGroups({
    activeLayer, areaOptions, brushSize, busy, drawColor, drawWidth, dungeon, erasable,
    feetPerCell, handleAddImage, handleAddToken, handleAreaOptionsChange, handleEnableFog,
    handleFitPlayArea, handleFogAll, handleGridChange, handlePlaceCharacter,
    handlePlaceObject, handlePlayAreaChange, handleRemoveCharacter, handleShownImageChange,
    handleUndoDrawing, handleUploadBackground, handleUploadMap, hexcrawl, measureShape,
    paintMode, role, roster, scene, setBrushSize, setDrawColor, setDrawWidth,
    setFeetPerCell, setImportOpen, setMeasureShape, setMonsterOpen, setPaintMode,
    setPlacementDrag, shownImageForViewport, tokens,
  }), [
    activeLayer, areaOptions, brushSize, busy, drawColor, drawWidth, erasable.length,
    handleAreaOptionsChange,
    handleAddToken, handleEnableFog, handleFitPlayArea, handleFogAll, handleGridChange,
    handlePlaceCharacter, handlePlaceObject, handlePlayAreaChange, handleRemoveCharacter,
    handleUndoDrawing, handleUploadMap,
    handleUploadBackground, handleShownImageChange, handleAddImage, paintMode,
    role.isGm, role.ownedCharacterIds, roster, scene, shownImageForViewport, tokens, measureShape, feetPerCell,
    hexcrawl, dungeon,
  ]);

  // While editing one layer, strokes on the others fade back rather than
  // disappear: they are context, and losing them would make the map unreadable
  // the moment you switch tools.
  const visibleDrawings = useMemo(() => (
    spectator || gmPlayerPreview
      ? drawings.filter((drawing) => drawing.layer !== 'gm' && !drawing.hiddenFromPlayers)
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
    // The GM's real enemy HP are overlaid the same way, except in player view.
    () => withSheetVitals(
      (gmPlayerPreview ? (list) => list : gmVitals.overlay)(resolveTokens(tokens, ghosts, draggingRef.current)),
      roster,
    )
      .map((token) => {
        // A monster's artwork is a file on the scene; a character's is their
        // portrait, which belongs to the sheet and follows it everywhere.
        const url = (token.portraitPath && portraits[token.portraitPath])
          || (token.imagePath && tokenImageUrls[token.imagePath])
          || null;
        return url ? { ...token, imageUrl: url } : token;
      }),
    [ghosts, gmPlayerPreview, gmVitals.overlay, portraits, roster, tokenImageUrls, tokens],
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

  const {
    gmTurnView, shownTurns, initiativeEntries, initiativeRound, initiativeChoices, turnBusy,
    handleTurnStep, handleChooseFight, statBlockRef, setStatBlockRef,
    statBlockOpenedAreaRef, statBlockFor, openStatBlock, closeStatBlock, statBlock,
    handleStatBlockRoll, gmInitiativeEntries, handleEntryClick, handleEntryPointerDown,
  } = useSceneInitiative({
    role, spectator, gmPlayerPreview, sceneTurns, gmVitals, monsterDb, notify, activeLayer,
    visibleTokens, projectedTokens, contentView, setContentView, floatingSheetOpen,
    setFloatingSheetOpen, mapFullscreen, setPlacementDrag, handleCreatureRoll,
  });

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
      // A GM without characters still reads a creature's stat block there.
      if (!statBlockRef) setContentView('map');
      return;
    }
    if (!sheetChoices.some((entry) => entry.characterId === sheetCharacterId)) {
      setSheetCharacterId(sheetChoices[0].characterId);
    }
  }, [sheetCharacterId, sheetChoices, statBlockRef]);

  // In fullscreen the viewport is the only subtree the browser paints. The
  // same sheet therefore moves into its draggable viewport window instead of
  // remaining mounted a second time in the hidden side column.
  const showsStatBlock = Boolean(statBlock);
  // No character is picked while a stat block is on show.
  const sheetAreaSelectedId = showsStatBlock ? null : sheetCharacterId;
  const hasSheetContent = sheetChoices.length > 0 || showsStatBlock;
  const sideSheetOpen = contentView === 'sheet' && !mapFullscreen && !gmPlayerPreview && hasSheetContent;
  const selectSheetCharacter = useCallback((characterId) => {
    // Picked a character: the area is the user's now, and stays open.
    setStatBlockRef(null);
    statBlockOpenedAreaRef.current = false;
    startSheetTransition(() => setSheetCharacterId(characterId));
  }, []);
  // The GM's click on a piece: a character's opens their sheet beside the
  // board, a creature's its stat block (user decision 2026-10-26: GM only — a
  // player has the Sheet button for their own).
  const openCharacterSheet = useCallback((characterId) => {
    if (!sheetChoices.some((entry) => entry.characterId === characterId)) return;
    selectSheetCharacter(characterId);
    if (mapFullscreen) setFloatingSheetOpen(true);
    else setContentView('sheet');
  }, [mapFullscreen, selectSheetCharacter, sheetChoices]);
  const handleTokenClick = useCallback((token) => {
    if (token?.characterId) {
      openCharacterSheet(token.characterId);
      return;
    }
    const ref = parseSourceRef(token?.sourceRef);
    if (ref) openStatBlock(ref);
  }, [openCharacterSheet, openStatBlock]);
  const sheetAreaContent = (placement) => {
    if (showsStatBlock) {
      return (
        <MonsterStatBlockView
          monster={statBlock.monster}
          legendaryGroups={monsterDb.legendaryGroups}
          conditions={statBlock.combatant.activeConditions || []}
          onRoll={handleStatBlockRoll}
          onClose={closeStatBlock}
        />
      );
    }
    return sheetCharacterId ? (
      <EmbeddedBattleMapSheet
        key={`${placement}:${sheetCharacterId}`}
        characterId={sheetCharacterId}
        digest={rosterDigests.get(String(sheetCharacterId)) ?? null}
        onRoll={handleSheetRoll}
      />
    ) : null;
  };

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
          atmosphere={viewportAtmosphere}
          imageFilter={viewportImageFilter}
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
          initiative={<InitiativeStrip entries={initiativeEntries} round={initiativeRound} />}
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
        {/* On a phone the GM's four buttons share one row under the name: what
            the table sees on the left, what the GM is looking at on the right. */}
        <Box sx={role.isGm ? sceneGmControlsSx : sceneControlsPassThroughSx}>
        {role.isGm ? (
          <Stack direction="row" spacing={0.75} useFlexGap sx={scenePresenterActionsSx}>
            {!gmPlayerPreview ? (
              <LiveControls
                isLive={scene.isLive}
                projectorFollowing={projectorFollowing}
                // A scene that is not live has no projector to point anywhere.
                projectorAttached={projectorControlsOpen}
                onToggleLive={handleToggleLive}
                onToggleFreeze={handleToggleProjectorFollow}
                onOpenProjector={openSpectator}
                onStopProjector={stopProjector}
              />
            ) : null}
            {gmTurnView && !initiativeEntries.length ? (
              <InitiativeButton choices={initiativeChoices} onChoose={handleChooseFight} />
            ) : null}
          </Stack>
        ) : null}
        {/* What the GM is looking at, on the far side of what the table sees:
            the player preview changes nothing for anyone else, like the sheet. */}
        {role.isGm || !gmPlayerPreview ? (
          <Stack
            direction="row"
            spacing={0.75}
            sx={role.isGm ? sceneViewSwitchSx : scenePlayerViewSwitchSx}
          >
            {role.isGm ? (
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
                  sx={viewButtonSx}
                >
                  {/* The full label even on a phone: a bare "Player" reads
                      as a person, not a view. */}
                  {gmPlayerPreview ? 'Exit player view' : 'Player view'}
                </Button>
              </Tooltip>
            ) : null}
            {!gmPlayerPreview ? (
              <BattleMapViewSwitch
                view={contentView}
                choices={sheetChoices}
                selectedId={sheetAreaSelectedId}
                available={hasSheetContent}
                onViewChange={setContentView}
                onSelectionChange={selectSheetCharacter}
              />
            ) : null}
          </Stack>
        ) : null}
        </Box>
      </Box>

      <Box
        ref={contentLayoutRef}
        style={sideSheetOpen ? { '--sheet-grid-columns': sheetGridColumns(sheetSplit) } : undefined}
        sx={[contentLayoutSx, sideSheetOpen && contentLayoutOpenSx]}
      >
        <Box sx={viewportCellSx}>
          <SceneViewport
        scene={scene}
        imageUrl={viewportDisplay.url}
        preparedImageSize={viewportDisplay.imageSize}
        tokens={gmPlayerPreview ? projectedTokens : visibleTokens}
        snap
        canMove={gmPlayerPreview ? () => false : canMove}
        fog={scene.fog}
        atmosphere={viewportAtmosphere}
        imageFilter={viewportImageFilter}
        fogOpacity={role.isGm && !gmPlayerPreview ? GM_FOG_OPACITY : PLAYER_FOG_OPACITY}
        fogOnTop={!role.isGm || gmPlayerPreview}
        canSeeThroughFog={!role.isGm ? canMove : undefined}
        // Fog brushes are the GM's; drawing is everyone's, so a player keeps
        // the pencil and the eraser and loses only reveal/hide.
        paintMode={gmPlayerPreview ? 'select' : allowedPaintMode}
        brushSize={brushSize}
        activeLayer={role.isGm && !gmPlayerPreview ? activeLayer : null}
        showPlayArea={role.isGm && !gmPlayerPreview}
        backgroundOnly={viewportDisplay.shownImage === 'background'}
        initiative={(
          <InitiativeStrip
            entries={gmInitiativeEntries}
            round={initiativeRound}
            controls={gmTurnView}
            busy={turnBusy}
            choices={initiativeChoices}
            selectedKey={showsFight(shownTurns) ? `${shownTurns.instanceId}:${shownTurns.fightId}` : null}
            onStep={handleTurnStep}
            onChoose={handleChooseFight}
            onEntryClick={gmTurnView ? handleEntryClick : null}
            onEntryPointerDown={gmTurnView ? handleEntryPointerDown : null}
          />
        )}
        onTokenClick={gmTurnView ? handleTokenClick : null}
        // Top left: which picture is up is constant state, like the layer in the
        // opposite corner, and switching it is a move you make mid-scene.
        imageSwitch={role.isGm && !gmPlayerPreview
          ? (
            <Stack direction="row" spacing={0.75} sx={{ alignItems: 'flex-start' }}>
              <MapCorner
                scene={{ ...scene, shownImage: shownImageForViewport, backgroundPath: backgroundForViewport }}
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
                onImageFilterChange={handleImageFilterChange}
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
                  onClockChange={hexcrawl.setClock}
                  onClockAdvance={hexcrawl.advanceClock}
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
        onHexBubbleClose={!gmPlayerPreview ? hexcrawl.dismissBubble : undefined}
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
        areaOptions={areaOptions}
        onPlaceArea={gmPlayerPreview ? undefined : handlePlaceArea}
        drawingForMenu={gmPlayerPreview ? undefined : drawingForMenu}
        onDrawingMenu={gmPlayerPreview ? undefined : (drawing, at) => setDrawingMenu({ drawingId: drawing.id, at })}
        onLaser={gmPlayerPreview ? undefined : handleLaser}
        lasers={laserDots}
        rollBubbles={gmPlayerPreview ? projectedRollBubbles : rollBubbles}
        onRollBubbleDismiss={dismissRollBubble}
        diceThrows={gmPlayerPreview ? projectedDiceThrows : diceThrows}
        measureShape={measureShape}
        feetPerCellForRuler={feetPerCell}
        conditionEntries={conditionEntries}
        onTokenInspection={role.isGm && !gmPlayerPreview ? handleTokenInspection : undefined}
        onMeasure={gmPlayerPreview ? undefined : handleMeasure}
        remoteMeasure={remoteMeasure}
        feetPerCell={feetPerCell}
        // On the map, not in the scene bar, so fullscreen keeps it too.
        rolls={gmPlayerPreview ? null : (
          <RollsButton
            feed={rollFeed}
            onCustomRoll={handleCustomRoll}
            onClear={clearRollFeed}
          />
        )}
        controls={gmPlayerPreview ? null : (
          <SceneToolRail
            groups={toolGroups}
            activeId={paintToolGroup(allowedPaintMode)}
            onCursor={() => setPaintMode('select')}
            cursorContent={<CursorPanel paintMode={allowedPaintMode} onPaintModeChange={setPaintMode} />}
            placing={Boolean(placementDrag)}
          />
        )}
        // Inside the viewport, not beside it: a fullscreen map paints nothing
        // that is not one of its own descendants.
        toast={<DiceToast toast={rollToast} onClose={dismissRollToast} />}
        onFullscreenChange={handleMapFullscreenChange}
        onViewChange={role.isGm && !gmPlayerPreview ? handleCameraViewChange : undefined}
        viewCenterRef={viewCenterRef}
        fullscreenSheet={!gmPlayerPreview && hasSheetContent ? {
          choices: sheetChoices,
          selectedId: sheetAreaSelectedId,
          onSelectionChange: selectSheetCharacter,
          open: floatingSheetOpen,
          onOpenChange: setFloatingSheetOpen,
          content: sheetAreaContent('floating'),
        } : null}
        // Bottom left, opposite the fullscreen button: the layer you are editing
        // is a constant piece of state, not a setting you go and find.
        layerSwitch={role.isGm && !gmPlayerPreview
          ? <LayerPanel compact activeLayer={activeLayer} onActiveLayerChange={setActiveLayer} />
          : null}
        backgroundStrip={role.isGm && !gmPlayerPreview && shownImageForViewport === 'background'
          ? (
            <BackgroundStrip
              backgrounds={sceneBackgrounds(scene)}
              selected={backgroundForViewport}
              busy={busy}
              onSelect={handleSelectBackground}
              onAdd={handleUploadBackground}
              onRemove={handleRemoveBackground}
            />
          )
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
            <Box sx={sheetViewSx}>{sheetAreaContent('side')}</Box>
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

      {!gmPlayerPreview ? (
        <DrawingMenu
          drawing={menuDrawing}
          anchor={drawingMenu?.at || null}
          feetPerCell={feetPerCell}
          gridShape={isHexGrid(scene.grid) ? 'hex' : 'square'}
          onClose={() => setDrawingMenu(null)}
          onPreview={handlePreviewDrawing}
          onSave={handleSaveDrawing}
          onVisibility={role.isGm ? handleDrawingVisibility : undefined}
          onDelete={removeDrawing}
        />
      ) : null}

      {!gmPlayerPreview ? <TokenMenu
        token={menuToken}
        anchor={menu?.at || null}
        canEdit={role.isGm}
        canMark={canMarkToken(menuToken, {
          isGm: role.isGm,
          ownedCharacterIds: role.ownedCharacterIds,
        })}
        canShowHp={role.isGm || canMove(menuToken)}
        // Reminders are marks like conditions, and answer to the same
        // question: anyone at the table may put one on a creature, nobody may
        // put one on somebody else's character.
        canSetEffects={canMarkToken(menuToken, {
          isGm: role.isGm,
          ownedCharacterIds: role.ownedCharacterIds,
        })}
        canSetDeathSaves={role.isGm || canMove(menuToken)}
        canStyleObject={Boolean(menuToken?.iconKey) && (role.isGm || canMove(menuToken))}
        canRemove={role.isGm || canMove(menuToken)}
        onClose={() => setMenu(null)}
        onSave={role.isGm ? handleSaveToken : handleMarkToken}
        onVitals={role.isGm ? handleTokenVitals : null}
        onObjectStyle={handleObjectStyle}
        onVisibility={role.isGm ? handleTokenVisibility : undefined}
        onDelete={handleDeleteToken}
        onStatBlock={gmTurnView && statBlockFor(parseSourceRef(menuToken?.sourceRef))
          ? (token) => openStatBlock(parseSourceRef(token.sourceRef))
          : null}
        onSheet={!gmPlayerPreview && sheetChoices.some((entry) => entry.characterId === menuToken?.characterId)
          ? (token) => openCharacterSheet(token.characterId)
          : null}
      /> : null}
    </Stack>
  );
}

// The sheet takes its vitals from the roster's digest: the map already follows
// every campaign character, so the sheet opens no channel of its own.
const EmbeddedBattleMapSheet = memo(function EmbeddedBattleMapSheet({ characterId, digest, onRoll }) {
  return (
    <Suspense fallback={<Box sx={sheetLoadingSx}><CircularProgress size={26} /></Box>}>
      <CampaignSheetView
        sheetId={characterId}
        editable
        embedded
        liveDigest={digest}
        onRoll={onRoll}
        showOwnRollToast={false}
      />
    </Suspense>
  );
});
