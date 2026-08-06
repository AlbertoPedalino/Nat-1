import {
  lazy, memo, Suspense, useCallback, useEffect, useMemo, useRef, useState, useTransition,
} from 'react';
import {
  Box, Button, CircularProgress, IconButton, Stack, Tooltip, Typography,
} from '@mui/material';
import {
  Cloud, Dices, DoorOpen, Lock, LockOpen, MonitorOff, MonitorPlay, Pencil, Pointer, Radio, Ruler,
  Shapes, Users,
} from 'lucide-react';
import { useToast } from '../../../shared/ToastProvider.jsx';
import { useAuth } from '../../../shared/cloud/AuthProvider.jsx';
import { mergeVitals, readCampaignVitals } from '../../../shared/campaign/characterVitals.js';
import { toRoster, toRosterEntry, withSheetVitals } from '../../../shared/campaign/roster.js';
import { usePortraits } from '../../../shared/character/usePortraits.js';
import { listCampaignCharacters } from '../../../shared/cloud/campaigns.js';
import { patchCharacterData } from '../../../shared/cloud/cloudCharacters.js';
import { DEAD_CONDITION_KEY, setConditionActive } from '../../../shared/character/conditions.js';
import {
  clearLiveScene,
  createDrawing,
  createToken,
  deleteDrawing,
  deleteMapImage,
  deleteToken,
  listDrawings,
  listTokenSecrets,
  listTokens,
  moveDrawing,
  setLiveScene,
  setTokenConditions,
  setTokenEffects,
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
  toDrawing,
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
  canMarkToken, normalizePlayArea, sceneTitleFor, toScene,
} from '../../../shared/vtt/scene.js';
import {
  addRoll,
  currentBubbles,
  currentThrows,
  queueRollToast,
  rollAuthor,
} from '../../../shared/vtt/rollFeed.js';
import { formatRollTitle } from '../../../shared/character/dice.js';
import { throwFormula } from '../../../shared/vtt/throwRoll.js';
import { useRollChannel } from '../../../shared/cloud/useRollChannel.js';
import { sanitizeNoteText } from '../../../shared/vtt/drawing.js';
import { FEET_PER_CELL } from '../../../shared/vtt/measure.js';
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
import { battleMapSurfaceSx } from './battleMapSurface.js';
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

function paintToolGroup(mode) {
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
  // Dormant on a square map: it asks the database for nothing until the scene
  // is actually a hexcrawl. A player and the projector read it — the colours and
  // the party marker are the map everyone is looking at — but only the GM's own
  // window may run it, which is why the projector tab is not one even when it is
  // the GM who opened it.
  const hexcrawl = useSceneHexcrawl({ scene, isGm: role.isGm && !spectator });
  const [tokens, setTokens] = useState([]);
  const [ghosts, setGhosts] = useState({});
  const [roster, setRoster] = useState([]);
  // After the roster, which sizes the encounters it buys. The bestiary is
  // already loaded for the monster picker; the dungeon uses it to turn a rolled
  // budget in experience into creatures.
  const monsterDb = useMonsterDb();
  const dungeon = useSceneDungeon({
    scene,
    isGm: role.isGm && !spectator,
    monsters: monsterDb.monsters,
    partySize: Math.max(1, roster.length || 4),
  });
  // What is actually on screen: the URL and the mode it belongs to, updated
  // together once the picture has loaded.
  const [displayed, setDisplayed] = useState({ url: null, shownImage: 'map' });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const gridTimerRef = useRef(null);
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
  const [tokenImageUrls, setTokenImageUrls] = useState({});
  const [drawings, setDrawings] = useState([]);
  const [selectedDrawingId, setSelectedDrawingId] = useState(null);
  const [drawColor, setDrawColor] = useState('#e8c96a');
  const [drawWidth, setDrawWidth] = useState(3);
  const [contentView, setContentView] = useState('map');
  const [mapFullscreen, setMapFullscreen] = useState(false);
  const [sheetCharacterId, setSheetCharacterId] = useState(null);
  const [, startSheetTransition] = useTransition();
  const [sheetSplit, setSheetSplit] = useState(DEFAULT_SHEET_SPLIT);
  const contentLayoutRef = useRef(null);
  const fallbackCameraSourceRef = useRef(createCameraSourceId());
  const presenterCameraSource = cameraSourceId || fallbackCameraSourceRef.current;
  const cameraPoseRef = useRef(null);
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
  const sceneShownImageRef = useRef(scene.shownImage);
  sceneShownImageRef.current = scene.shownImage;
  const sheetSplitStorageKey = `gb:vtt:sheet-split:${user?.id || 'local'}`;
  const [lasers, setLasers] = useState({});
  // Rolls said at the table. In memory only: a roll is an event, not a record.
  const [rollFeed, setRollFeed] = useState([]);
  // A custom roll enters the feed immediately to start its physical throw, but
  // the result stays pending until DiceTray paints the final settled frame.
  const pendingRollToastsRef = useRef(new Map());
  // Your own roll, in the same panel the character sheet shows it in. Only your
  // own: everyone else's arrives as a bubble over their piece and a line in the
  // log, which is what the table needs to see.
  const [rollToast, setRollToast] = useState(null);
  // Stable, because the toast dismisses itself on a timer keyed to this
  // callback: a new function every render restarted the timer every render, and
  // the toast sat there for good.
  const dismissRollToast = useCallback(() => setRollToast(null), []);
  const showSettledRollToast = useCallback((rollId) => {
    const entry = pendingRollToastsRef.current.get(rollId);
    if (!entry) return;
    pendingRollToastsRef.current.delete(rollId);
    setRollToast(entry);
  }, []);
  // Yours to clear, and only yours: the log was never anywhere but this page's
  // memory, so there is nothing to tell anybody else about.
  const clearRollFeed = useCallback(() => setRollFeed([]), []);
  const handleSheetRoll = useCallback((roll) => {
    const immediateToast = queueRollToast(roll, pendingRollToastsRef.current);
    if (immediateToast) setRollToast(immediateToast);
    // The sheet lives on this screen: retain its log/toast/physical throw, but
    // do not repeat the same result as a speech bubble over the acting token.
    setRollFeed((current) => addRoll(current, roll, { local: true }));
  }, []);
  const [rollTick, setRollTick] = useState(0);
  const [measureShape, setMeasureShape] = useState('line');
  const [feetPerCell, setFeetPerCell] = useState(FEET_PER_CELL);
  const [remoteMeasure, setRemoteMeasure] = useState(null);
  const conditionEntries = useConditionEntries();

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
    setFollowCameraPose(null);
    hasPresenterFrameRef.current = false;
  }, [scene.id]);

  useEffect(() => {
    if (spectator && projectorFollowing) setProjectorShownImage(scene.shownImage);
  }, [projectorFollowing, scene.shownImage, spectator]);

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

  const fogCells = useMemo(
    () => (imageSize ? fogSizeForImage(imageSize, scene.grid) : {
      cols: DEFAULT_MAP_CELLS.cols * DEFAULT_FOG_SCALE,
      rows: DEFAULT_MAP_CELLS.rows * DEFAULT_FOG_SCALE,
    }),
    [imageSize, scene.grid],
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      listTokens(scene.id),
      // Everyone at the table reads the campaign's sheets — RLS allows it, and
      // it is where the party's hit points come from. Only the GM has secret
      // labels to read; for a player that call comes back empty anyway.
      scene.campaignId ? listCampaignCharacters(scene.campaignId) : Promise.resolve([]),
      role.isGm && !spectator ? listTokenSecrets(scene.id) : Promise.resolve({}),
      listDrawings(scene.id),
    ])
      .then(([sceneTokens, characterRows, secrets, sceneDrawings]) => {
        if (cancelled) return;
        setTokens(sceneTokens.map((token) => (
          secrets[token.id] ? { ...token, secretLabel: secrets[token.id] } : token
        )));
        setRoster(toRoster(characterRows));
        setDrawings(sceneDrawings);
        // Deriving max HP needs the class adapters, so it lands a moment after
        // the names and colours rather than holding the whole scene back.
        readCampaignVitals(characterRows)
          .then((vitals) => { if (!cancelled) setRoster((current) => mergeVitals(current, vitals)); })
          .catch(() => {});
      })
      .catch((cause) => {
        if (!cancelled) notify('error', cause?.message || 'Could not load this scene.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [notify, role.isGm, scene.campaignId, scene.id, spectator]);

  // Whichever of the two pictures the table is looking at. The other stays
  // uploaded and one click away.
  const shownImageForViewport = spectator ? projectorShownImage : scene.shownImage;
  const shownPath = shownImageForViewport === 'background' ? scene.backgroundPath : scene.imagePath;

  // The picture and everything that belongs to it change together. Flipping the
  // mode as soon as the row changed showed the switch in three steps: fog off,
  // bare map for a beat, then the background — and the reverse on the way back,
  // which briefly showed an uncovered battlemap to the whole table.
  useEffect(() => {
    let cancelled = false;
    if (!shownPath) {
      setDisplayed({ url: null, shownImage: shownImageForViewport });
      return () => { cancelled = true; };
    }

    signMapImage(shownPath)
      .then((url) => {
        if (cancelled || !url) return null;
        // Decoded before it is shown, so the swap is one frame with the new
        // picture already in memory rather than a gap while it downloads.
        const image = new Image();
        image.src = url;
        return (image.decode ? image.decode().catch(() => {}) : Promise.resolve())
          .then(() => { if (!cancelled) setDisplayed({ url, shownImage: shownImageForViewport }); });
      })
      .catch(() => { if (!cancelled) setDisplayed({ url: null, shownImage: shownImageForViewport }); });
    return () => { cancelled = true; };
  }, [shownImageForViewport, shownPath]);

  // Pieces carrying an uploaded picture need a signed URL each; bestiary art is
  // an ordinary external URL and needs none.
  useEffect(() => {
    let cancelled = false;
    const paths = [...new Set(tokens.map((token) => token.imagePath).filter(Boolean))];
    if (!paths.length) {
      setTokenImageUrls((current) => (Object.keys(current).length ? {} : current));
      return () => { cancelled = true; };
    }
    Promise.all(paths.map(async (path) => [path, await signMapImage(path).catch(() => null)]))
      .then((entries) => { if (!cancelled) setTokenImageUrls(Object.fromEntries(entries)); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [tokens]);

  useEffect(() => () => {
    clearTimeout(gridTimerRef.current);
    clearTimeout(playAreaTimerRef.current);
  }, []);

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
  }, [onSceneChange]);

  // A stroke is immutable once written, so there is no reconciliation to do:
  // it either arrives or is deleted.
  const handleDrawingEvent = useCallback((payload) => {
    const type = String(payload?.eventType || '').toUpperCase();
    if (type === 'DELETE') {
      // `old_record` is what supabase-js calls it on some payload shapes; both
      // are read so a rubbed-out stroke disappears everywhere, not only for the
      // person holding the eraser.
      const id = payload?.old?.id || payload?.old_record?.id;
      if (id) setDrawings((current) => current.filter((item) => item.id !== id));
      return;
    }
    const drawing = toDrawing(payload?.new);
    if (!drawing) return;
    // Insert or update, the same either way: a mark that was moved keeps its id,
    // so it has to replace the copy already held rather than be ignored as one
    // that is already there.
    setDrawings((current) => (
      current.some((item) => item.id === drawing.id)
        ? current.map((item) => (item.id === drawing.id ? drawing : item))
        : [...current, drawing]
    ));
  }, []);

  // Only the roster entry is updated, never the token row: the sheet stays the
  // one place a character's hit points live, and the map reads them.
  const handleCharacterEvent = useCallback((payload) => {
    const row = payload?.new;
    const entry = toRosterEntry(row);
    if (!entry) return;
    setRoster((current) => current.map((item) => (
      // Conditions come straight off the row, but hit points have to be derived
      // again — so the old ones are kept until they are. Blanking them in
      // between made the bar flicker off on every edit to the sheet.
      item.characterId === entry.characterId
        ? { ...entry, hpCurrent: item.hpCurrent, hpMax: item.hpMax, tempHp: item.tempHp }
        : item
    )));
    readCampaignVitals([row])
      .then((vitals) => setRoster((current) => mergeVitals(current, vitals)))
      .catch(() => {});
  }, []);

  const getCameraPose = useCallback(() => cameraPoseRef.current, []);
  const getPresenterState = useCallback(() => ({
    following: projectorFollowingRef.current,
    shownImage: sceneShownImageRef.current,
    pose: cameraPoseRef.current,
  }), []);
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
  const { sendDrag, sendCamera, sendPresenterState } = useSceneLive({
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
  });

  const handleCameraViewChange = useCallback((pose) => {
    cameraPoseRef.current = pose;
    sendCamera(pose);
  }, [sendCamera]);

  const handleToggleProjectorFollow = useCallback(() => {
    const following = !projectorFollowingRef.current;
    projectorFollowingRef.current = following;
    setProjectorFollowing(following);
    sendPresenterState({
      following,
      shownImage: scene.shownImage,
      pose: cameraPoseRef.current,
    });
  }, [scene.shownImage, sendPresenterState]);

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
    sendDrag({ id: token.id, x: position.x, y: position.y });
  }, [sendDrag]);

  const handleMoveToken = useCallback(async (token, position) => {
    setTokens((current) => current.map((item) => (
      item.id === token.id ? { ...item, ...position } : item
    )));
    try {
      await updateToken(token.id, position);
    } catch (cause) {
      setTokens((current) => current.map((item) => (item.id === token.id ? token : item)));
      notify('error', cause?.message || 'Could not move that token.');
    } finally {
      // Released only after the write settles: until then a remote echo would
      // still be our own move coming back.
      draggingRef.current = null;
    }
  }, [notify]);

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
        .catch((cause) => notify('error', cause?.message || 'Could not save the play area.'))
        .finally(() => { gridEditRef.current = false; });
    }, GRID_SAVE_DELAY);
  }, [notify, onSceneChange, scene]);

  // The map itself is the sensible play area: the GM only ever needs to change
  // it to make room for staging outside the picture.
  const handleFitPlayArea = useCallback(() => {
    handlePlayAreaChange({ x: 0, y: 0, w: mapCells.cols, h: mapCells.rows });
  }, [handlePlayAreaChange, mapCells]);

  // One upload path for both slots: the only difference is which column it
  // lands in, and which picture the table then sees.
  const uploadSceneImage = useCallback(async (file, slot) => {
    setBusy(true);
    let uploadedPath = null;
    const previousPath = slot === 'background' ? scene.backgroundPath : scene.imagePath;
    try {
      uploadedPath = await uploadMapImage(scene.campaignId, scene.id, file);
      const updated = await updateScene(scene.id, {
        [slot === 'background' ? 'backgroundPath' : 'imagePath']: uploadedPath,
        shownImage: slot,
      });
      onSceneChange(updated);
      if (previousPath && previousPath !== uploadedPath) {
        try {
          await deleteMapImage(previousPath);
        } catch {
          notify('warning', 'The new image was saved, but the previous file could not be cleaned up.');
        }
      }
    } catch (cause) {
      // Upload and row update are separate Supabase services. If the row write
      // fails, undo the successful upload so it cannot become an orphan.
      if (uploadedPath) {
        try { await deleteMapImage(uploadedPath); } catch {}
      }
      notify('error', cause?.message || 'Could not upload that image.');
    } finally {
      setBusy(false);
    }
  }, [notify, onSceneChange, scene.backgroundPath, scene.campaignId, scene.id, scene.imagePath]);

  const handleUploadMap = useCallback((file) => uploadSceneImage(file, 'map'), [uploadSceneImage]);
  const handleUploadBackground = useCallback(
    (file) => uploadSceneImage(file, 'background'),
    [uploadSceneImage],
  );

  const handleShownImageChange = useCallback(async (shownImage) => {
    onSceneChange({ ...scene, shownImage });
    try {
      await updateScene(scene.id, { shownImage });
    } catch (cause) {
      notify('error', cause?.message || 'Could not switch the picture.');
    }
  }, [notify, onSceneChange, scene]);

  const addToken = useCallback(async (token) => {
    setBusy(true);
    try {
      const created = await createToken(scene.id, token);
      setTokens((current) => (
        current.some((item) => item.id === created.id) ? current : [...current, created]
      ));
    } catch (cause) {
      notify('error', cause?.message || 'Could not add that token.');
    } finally {
      setBusy(false);
    }
  }, [notify, scene.id]);

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

  const handlePlaceCharacter = useCallback(
    (entry) => addToken(characterToken(entry, nextFreeCell())),
    [addToken, characterToken, nextFreeCell],
  );

  const handleDropCharacter = useCallback((characterId, position) => {
    const entry = roster.find((item) => item.characterId === characterId);
    if (!entry) return;
    if (tokens.some((token) => token.characterId === characterId)) return;
    addToken(characterToken(entry, position));
  }, [addToken, characterToken, roster, tokens]);

  // Same placement path as an encounter import, minus the fight: a creature
  // dropped on the map has nothing to stay in step with.
  const handlePlaceMonster = useCallback(async (monster, count, { layer, position } = {}) => {
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
  }, [notify, scene.id, tokens]);

  const handleAddToken = useCallback(() => addToken({
    ...nextFreeCell(),
    layer: activeLayer,
    label: activeLayer === 'gm' ? 'Hidden' : 'Token',
  }), [activeLayer, addToken, nextFreeCell]);

  // A player's marker always lands on the token layer: they have no layer
  // selector, and the GM layer is not theirs to write to — the insert policy
  // would refuse it anyway.
  const handleAddMarker = useCallback(() => addToken({
    ...nextFreeCell(),
    layer: 'tokens',
    label: 'Marker',
  }), [addToken, nextFreeCell]);

  const handlePlaceObject = useCallback((object, position) => {
    if (!object?.key) return;
    addToken({
      ...(position || nextFreeCell()),
      layer: object.layer || (role.isGm ? activeLayer : 'tokens'),
      label: object.label,
      color: object.color || '#e8c96a',
      iconKey: object.key,
      iconStrokeWidth: object.strokeWidth,
      rotation: 0,
      w: 1,
      h: 1,
    });
  }, [activeLayer, addToken, nextFreeCell, role.isGm]);

  const handleImportEncounter = useCallback(async (
    combatants, { layer, instanceId, fightId, position } = {},
  ) => {
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
  }, [notify, scene.id, tokens]);

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
    } else if (placement.kind === 'object') {
      handlePlaceObject(placement.object, position);
    }
  }, [handleDropCharacter, handleImportEncounter, handlePlaceMonster, handlePlaceObject]);

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

  // Only the fog brushes belong to the GM. Listing them, rather than listing
  // what a player may hold, is what stopped the laser and the ruler from being
  // quietly downgraded to 'select' every time a new tool was added.
  const allowedPaintMode = useMemo(() => {
    // Nothing to paint on a background: no fog, no board, nothing that would be
    // saved anywhere. The laser and the ruler still work — pointing at a picture
    // is exactly what a background is for.
    const showingBackground = scene.shownImage === 'background';
    if (showingBackground && !['select', 'laser', 'measure'].includes(paintMode)) return 'select';
    const gmOnly = paintMode === 'reveal' || paintMode === 'hide';
    return gmOnly && !role.isGm ? 'select' : paintMode;
  }, [paintMode, role.isGm, scene.shownImage]);

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

  const { publish: publishRoll } = useRollChannel({
    campaignId: scene.campaignId,
    onRoll: (roll) => setRollFeed((current) => addRoll(current, roll)),
  });

  // A roll made from the map itself. The channel does not echo your own
  // broadcast back to you, so the feed is fed here as well as published.
  const handleCustomRoll = useCallback((formula) => {
    // One id for everyone, and the seed the throw is simulated from: the roll is
    // the same event, with the same dice landing the same way, on every screen.
    const id = `custom:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
    // Thrown, not generated: the dice come down on the map and the faces they
    // land on are the result.
    const thrown = throwFormula(formula, id);
    if (!thrown) return;

    const entry = {
      id,
      label: formatRollTitle('Custom Roll', formula),
      detail: thrown.detail,
      total: thrown.total,
      rolls: thrown.rolls,
      // Only when there is one: a bare "+0" under a damage roll is noise.
      ...(thrown.modifier ? { meta: { bonus: thrown.modifier } } : {}),
      thrown: true,
      timestamp: Date.now(),
      ...rollAuthor({
        isGm: role.isGm,
        ownedCharacterIds: role.ownedCharacterIds,
        tokens,
        roster,
      }),
    };
    queueRollToast(entry, pendingRollToastsRef.current);
    setRollFeed((current) => addRoll(current, entry, { local: true }));
    publishRoll(entry);
  }, [publishRoll, role.isGm, role.ownedCharacterIds, roster, tokens]);

  // A bubble expires on its own, and nothing else on the page changes when it
  // does — so the clock has to nudge the render.
  useEffect(() => {
    if (!rollFeed.length) return undefined;
    const timer = setInterval(() => setRollTick((tick) => tick + 1), 1000);
    return () => clearInterval(timer);
  }, [rollFeed.length]);

  const tokenByCharacter = useMemo(() => new Map(
    tokens.filter((token) => token.characterId).map((token) => [token.characterId, token]),
  ), [tokens]);

  const rollBubbles = useMemo(() => (
    currentBubbles(rollFeed)
      .map((roll) => ({ roll, token: tokenByCharacter.get(roll.characterId) }))
      .filter((entry) => entry.token)
    // `rollTick` is what retires a bubble whose time is up.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [rollFeed, rollTick, tokenByCharacter]);

  // The dice themselves, which land next to the roller's piece — or in the
  // middle of the board when the roller has none, as the GM does.
  const diceThrows = useMemo(() => (
    currentThrows(rollFeed)
      .map((roll) => ({ roll, token: tokenByCharacter.get(roll.characterId) || null }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [rollFeed, rollTick, tokenByCharacter]);

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

    if (!role.isGm) {
      return [
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
              onPlaceCharacter={handlePlaceCharacter}
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
      {
        id: 'pieces',
        label: 'Pieces',
        icon: Users,
        content: (
          <RosterPanel
            roster={roster}
            tokens={tokens}
            busy={busy}
            activeLayer={activeLayer}
            onPlaceCharacter={handlePlaceCharacter}
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
      ...(dungeon.enabled ? [{
        id: 'dungeon',
        label: 'Dungeon',
        icon: DoorOpen,
        content: (
          <DungeonPanel
            plan={dungeon.plan}
            dungeonKey={dungeon.key}
            placed={dungeon.placed}
            busy={dungeon.busy}
            error={dungeon.error}
            partySize={Math.max(1, roster.length || 4)}
            onPopulate={dungeon.populate}
            onPlaceRoom={dungeon.placeRoom}
            monstersForRoom={dungeon.monstersForRoom}
            markersForRoom={dungeon.markersForRoom}
          />
        ),
      }] : []),
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
    handlePlaceCharacter, handlePlaceObject, handlePlayAreaChange, handleUndoDrawing, handleUploadMap,
    handleUploadBackground, handleShownImageChange, handleAddImage, paintMode,
    role.isGm, role.ownedCharacterIds, roster, scene, tokens, measureShape, feetPerCell,
    rollFeed, handleCustomRoll, clearRollFeed, hexcrawl, dungeon,
  ]);

  // While editing one layer, strokes on the others fade back rather than
  // disappear: they are context, and losing them would make the map unreadable
  // the moment you switch tools.
  const visibleDrawings = useMemo(() => (
    spectator
      ? drawings.filter((drawing) => drawing.layer !== 'gm')
      : role.isGm
      ? drawings.map((drawing) => (
        drawing.layer === activeLayer ? drawing : { ...drawing, color: fade(drawing.color) }
      ))
      : drawings
  ), [activeLayer, drawings, role.isGm, spectator]);

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

  // A projector opened from a GM browser still has GM database permissions.
  // Recreate the player boundary explicitly before anything reaches the DOM:
  // no hidden layer, no staging area, and no secret label.
  const projectedTokens = useMemo(() => {
    if (!spectator) return visibleTokens;
    return projectPlayerTokens(visibleTokens, scene.playArea);
  }, [scene.playArea, spectator, visibleTokens]);

  const projectedTokenById = useMemo(
    () => new Map(projectedTokens.map((token) => [token.id, token])),
    [projectedTokens],
  );
  const projectedRollBubbles = useMemo(() => (
    spectator
      ? rollBubbles
        .map((entry) => ({ ...entry, token: projectedTokenById.get(entry.token?.id) || null }))
        .filter((entry) => entry.token)
      : rollBubbles
  ), [projectedTokenById, rollBubbles, spectator]);
  const projectedDiceThrows = useMemo(() => (
    spectator
      ? diceThrows.map((entry) => ({
        ...entry,
        token: entry.token ? (projectedTokenById.get(entry.token.id) || null) : null,
      }))
      : diceThrows
  ), [diceThrows, projectedTokenById, spectator]);

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
  const sideSheetOpen = contentView === 'sheet' && !mapFullscreen;
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
          imageUrl={displayed.url}
          tokens={projectedTokens}
          snap
          canMove={() => false}
          fog={scene.fog}
          fogOpacity={PLAYER_FOG_OPACITY}
          paintMode="select"
          backgroundOnly={displayed.shownImage === 'background'}
          // The projector shows the crawl as the table sees it: the country
          // they have been through, and the hex they are standing in.
          hexCells={hexcrawl.visible ? hexcrawl.cellsByKey : null}
          partyHex={hexcrawl.partyHex}
          onImageSize={setImageSize}
          drawings={visibleDrawings}
          lasers={laserDots}
          rollBubbles={projectedRollBubbles}
          diceThrows={projectedDiceThrows}
          onDiceSettled={showSettledRollToast}
          conditionEntries={conditionEntries}
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
        {role.isGm && onOpenScene ? <SceneSwitcher scene={scene} onOpenScene={onOpenScene} /> : null}
        <Box sx={sceneIdentitySx}>
          <Typography variant="h1" sx={sceneTitleSx}>
            {sceneTitleFor(scene, { isGm: role.isGm, campaignName: role.campaignName })}
          </Typography>
          {role.isGm ? (
            <Tooltip title="Rename scene">
              <IconButton size="small" aria-label="Rename scene" onClick={handleRename} sx={sceneRenameButtonSx}>
                <Pencil size={11} />
              </IconButton>
            </Tooltip>
          ) : null}
        </Box>
        {role.isGm ? (
          <Stack direction="row" spacing={0.75} useFlexGap sx={scenePresenterActionsSx}>
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
            {/* A scene that is not live has no projector to point anywhere, and
                a projector already running only needs stopping and freezing. */}
            {scene.isLive && !projectorControlsOpen ? (
              <Button
                size="small"
                variant="outlined"
                startIcon={<MonitorPlay size={14} />}
                onClick={openSpectator}
              >
                Projector mode
              </Button>
            ) : null}
            {scene.isLive && projectorControlsOpen ? (
              <>
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
                {/* Never about pausing the table: the projector keeps showing
                    everything that moves, it just stops being dragged around by
                    the GM's own panning and zooming. */}
                <Tooltip
                  title={projectorFollowing
                    ? 'The projector follows your view — lock it where it is'
                    : 'The projector is locked — let it follow your view again'}
                >
                  <Button
                    size="small"
                    variant={projectorFollowing ? 'outlined' : 'contained'}
                    startIcon={projectorFollowing ? <Lock size={14} /> : <LockOpen size={14} />}
                    aria-pressed={!projectorFollowing}
                    onClick={handleToggleProjectorFollow}
                  >
                    {projectorFollowing ? 'Lock camera' : 'Follow my view'}
                  </Button>
                </Tooltip>
              </>
            ) : null}
          </Stack>
        ) : null}
        <Box sx={sceneViewSwitchSx}>
          <BattleMapViewSwitch
            view={contentView}
            choices={sheetChoices}
            selectedId={sheetCharacterId}
            onViewChange={setContentView}
            onSelectionChange={selectSheetCharacter}
          />
        </Box>
      </Box>

      <Box
        ref={contentLayoutRef}
        style={sideSheetOpen ? { '--sheet-grid-columns': sheetGridColumns(sheetSplit) } : undefined}
        sx={[contentLayoutSx, sideSheetOpen && contentLayoutOpenSx]}
      >
        <Box sx={[viewportCellSx, sideSheetOpen && viewportCellStackedSx]}>
          <SceneViewport
        scene={scene}
        imageUrl={displayed.url}
        tokens={visibleTokens}
        snap
        canMove={canMove}
        fog={scene.fog}
        fogOpacity={role.isGm ? GM_FOG_OPACITY : PLAYER_FOG_OPACITY}
        // Fog brushes are the GM's; drawing is everyone's, so a player keeps
        // the pencil and the eraser and loses only reveal/hide.
        paintMode={allowedPaintMode}
        brushSize={brushSize}
        activeLayer={role.isGm ? activeLayer : null}
        showPlayArea={role.isGm}
        backgroundOnly={displayed.shownImage === 'background'}
        // Top left: which picture is up is constant state, like the layer in the
        // opposite corner, and switching it is a move you make mid-scene.
        imageSwitch={role.isGm
          ? (
            <Stack direction="row" spacing={0.75} sx={{ alignItems: 'flex-start' }}>
              <MapCorner
                scene={scene}
                busy={busy}
                open={openCorner === 'pictures'}
                onOpenChange={(next) => setOpenCorner(next ? 'pictures' : null)}
                onShownImageChange={handleShownImageChange}
                onUploadMap={handleUploadMap}
                onUploadBackground={handleUploadBackground}
                onAddImage={handleAddImage}
                onGridChange={handleGridChange}
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
        hexCells={hexcrawl.visible ? hexcrawl.cellsByKey : null}
        partyHex={hexcrawl.partyHex}
        selectedHex={hexcrawl.selected}
        onHexClick={hexcrawl.enabled ? hexcrawl.clickHex : undefined}
        hexBubble={hexcrawl.enabled ? hexcrawl.bubble : null}
        onHexBubbleOpen={hexcrawl.openResult}
        onImageSize={setImageSize}
        onDragToken={handleDragToken}
        onMoveToken={handleMoveToken}
        onResizeToken={handleMoveToken}
        onRotateToken={handleMoveToken}
        canSetDeathSaves={(token) => role.isGm || canMove(token)}
        onDeathSaveChange={handleDeathSaveChange}
        onPaint={handlePaint}
        onPaintEnd={handlePaintEnd}
        onContextMenu={(token, at) => setMenu({ tokenId: token.id, at })}
        onDropCharacter={handleDropCharacter}
        placementDrag={placementDrag}
        onDropPlacement={handleDropPlacement}
        drawings={visibleDrawings}
        movableDrawing={movableDrawing}
        selectedDrawingId={selectedDrawingId}
        onSelectDrawing={setSelectedDrawingId}
        onMoveDrawing={handleMoveDrawing}
        drawColor={drawColor}
        drawWidth={drawWidth}
        onDrawEnd={handleDrawEnd}
        onErase={handleErase}
        onWriteNote={handleWriteNote}
        onLaser={handleLaser}
        lasers={laserDots}
        rollBubbles={rollBubbles}
        diceThrows={diceThrows}
        onDiceSettled={showSettledRollToast}
        measureShape={measureShape}
        feetPerCellForRuler={feetPerCell}
        conditionEntries={conditionEntries}
        onMeasure={handleMeasure}
        remoteMeasure={remoteMeasure}
        feetPerCell={feetPerCell}
        controls={(
          <SceneToolRail
            groups={toolGroups}
            activeId={paintToolGroup(allowedPaintMode)}
            onCursor={() => setPaintMode('select')}
          />
        )}
        // Inside the viewport, not beside it: a fullscreen map paints nothing
        // that is not one of its own descendants.
        toast={<DiceToast toast={rollToast} onClose={dismissRollToast} />}
        onFullscreenChange={handleMapFullscreenChange}
        onViewChange={role.isGm ? handleCameraViewChange : undefined}
        fullscreenSheet={sheetChoices.length ? {
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
        layerSwitch={role.isGm
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
      <HexResultDialog result={hexcrawl.result} onClose={hexcrawl.dismissResult} />

      <MonsterPickerDialog
        open={monsterOpen}
        busy={busy}
        onClose={() => setMonsterOpen(false)}
        onPlace={handlePlaceMonster}
        onPlacementDragStart={setPlacementDrag}
        onPlacementDragEnd={() => setPlacementDrag(null)}
      />

      <EncounterImportDialog
        open={importOpen}
        busy={busy}
        onClose={() => setImportOpen(false)}
        onImport={handleImportEncounter}
        onPlacementDragStart={setPlacementDrag}
        onPlacementDragEnd={() => setPlacementDrag(null)}
      />

      <TokenMenu
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
        onDelete={handleDeleteToken}
      />

      {!role.isGm ? (
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

const sceneTopbarSx = {
  ...battleMapSurfaceSx,
  display: 'flex',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: 1,
  px: { xs: 1, md: 1.25 },
  py: 0.85,
  borderRadius: 1,
  boxShadow: '0 8px 24px rgba(0,0,0,0.22)',
};

// Shrinks rather than grows: the presenter controls belong next to the name the
// GM is reading, not pushed against the far edge of the bar.
const sceneIdentitySx = {
  display: 'flex',
  alignItems: 'center',
  gap: 0.25,
  flex: '0 1 auto',
  minWidth: 0,
};

const sceneTitleSx = {
  color: 'primary.main',
  fontSize: { xs: '0.98rem', md: '1.08rem' },
  lineHeight: 1.2,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const scenePresenterActionsSx = {
  alignItems: 'center',
  flexWrap: 'wrap',
  pl: { xs: 0, md: 1.25 },
  borderLeft: { xs: 0, md: '1px solid rgba(232,201,106,0.16)' },
  '& .MuiButton-root': {
    minHeight: 30,
    fontSize: '0.67rem',
    whiteSpace: 'nowrap',
  },
};

// A footnote on the title rather than a control of its own: small, riding the
// top of the text, and only fully lit once it is pointed at.
const sceneRenameButtonSx = {
  width: 18,
  height: 18,
  p: 0,
  alignSelf: 'flex-start',
  mt: -0.25,
  color: 'rgba(255,255,255,0.42)',
  '&:hover': {
    color: '#e8c96a',
    bgcolor: 'rgba(232,201,106,0.08)',
  },
};

const sceneViewSwitchSx = {
  ml: { xs: 0, md: 'auto' },
  pl: { xs: 0, md: 0.5 },
};

const spectatorRootSx = {
  position: 'fixed',
  inset: 0,
  width: '100vw',
  height: '100vh',
  overflow: 'hidden',
  bgcolor: '#000',
};

const editorRootSx = {
  flex: 1,
  // Without this a flex child refuses to shrink below its content, and the map
  // would push the page taller instead of fitting inside it.
  minHeight: 0,
};

const contentLayoutSx = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr)',
  gap: 1,
  flex: 1,
  minHeight: 0,
  // Stretched, not top-aligned: the cell has to be as tall as the row for the
  // map inside it to have a height to fill.
  alignItems: 'stretch',
};

const contentLayoutOpenSx = {
  gridTemplateColumns: {
    xs: 'minmax(0, 1fr)',
    lg: 'var(--sheet-grid-columns)',
  },
  columnGap: { xs: 1, lg: 0 },
  rowGap: 1,
  // One column means map above sheet, which cannot both fit a phone: that stack
  // scrolls. Side by side there is nothing to scroll — each half handles its
  // own.
  overflowY: { xs: 'auto', lg: 'visible' },
  // Two rows sized by what they hold rather than stretched to share the height
  // of a screen they do not fit in. Stretched, both halves were given the full
  // row and the sheet was drawn over the board.
  gridTemplateRows: { xs: 'auto auto', lg: 'auto' },
  alignContent: { xs: 'start', lg: 'stretch' },
};

const viewportCellSx = {
  minWidth: 0,
  minHeight: 0,
  display: 'flex',
};

// Stacked, the map takes a slice of the screen instead of all of it: with the
// sheet below, a board that keeps the whole window leaves the sheet somewhere
// past the bottom edge with nothing but the map — which swallows the touch to
// pan — between the reader and it.
const viewportCellStackedSx = {
  height: { xs: 'clamp(320px, 52dvh, 520px)', lg: 'auto' },
};

const sheetViewSx = {
  minWidth: 0,
  // Beside the map it is exactly as tall as the map and scrolls inside itself.
  // Stacked under it on a narrow screen it is as tall as the sheet and does not
  // scroll at all: the column that holds both does. Two scrollers inside each
  // other on a phone means a finger on the sheet moves the sheet, so the top of
  // it never comes into view.
  minHeight: 0,
  height: { lg: '100%' },
  overflow: { xs: 'visible', lg: 'auto' },
  border: '1px solid rgba(232, 201, 106, 0.3)',
  borderRadius: 1.5,
  bgcolor: 'rgba(5, 5, 7, 0.88)',
  backgroundImage: 'linear-gradient(145deg, rgba(255,255,255,0.025), transparent 42%)',
  boxShadow: '0 18px 52px rgba(0, 0, 0, 0.46)',
  // Paint containment belongs to the half that scrolls. On a phone the box grows
  // with the sheet and clipping it can only cut something off.
  contain: { xs: 'none', lg: 'layout paint' },
  isolation: 'isolate',
  '& > *': {
    width: '100%',
    maxWidth: 760,
    mx: 'auto',
  },
};

const sheetLoadingSx = {
  minHeight: 420,
  display: 'grid',
  placeItems: 'center',
};

// Half-transparent version of a stroke colour, for the layers not being edited.
function fade(color) {
  const hex = typeof color === 'string' && /^#[0-9a-f]{6}$/i.test(color) ? color : '#e8c96a';
  return `${hex}55`;
}
