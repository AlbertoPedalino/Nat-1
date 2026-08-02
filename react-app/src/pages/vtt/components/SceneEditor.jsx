import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Chip, CircularProgress, Stack, Typography } from '@mui/material';
import { Cloud, Dices, Eye, Pencil, Pointer, Radio, Ruler, Shield, Users } from 'lucide-react';
import { useToast } from '../../../shared/ToastProvider.jsx';
import { useAuth } from '../../../shared/cloud/AuthProvider.jsx';
import { mergeVitals, readCampaignVitals } from '../../../shared/campaign/characterVitals.js';
import { toRoster, toRosterEntry, withSheetVitals } from '../../../shared/campaign/roster.js';
import { listCampaignCharacters } from '../../../shared/cloud/campaigns.js';
import { patchCharacterData } from '../../../shared/cloud/cloudCharacters.js';
import {
  clearLiveScene,
  createDrawing,
  createToken,
  deleteDrawing,
  deleteToken,
  listDrawings,
  listTokenSecrets,
  listTokens,
  setLiveScene,
  setTokenConditions,
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
  drawingAtPoint,
  lastDrawing,
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
import { canMarkToken, normalizePlayArea, toScene } from '../../../shared/vtt/scene.js';
import { addRoll, currentBubbles, currentThrows, rollAuthor } from '../../../shared/vtt/rollFeed.js';
import { formatRollTitle } from '../../../shared/character/dice.js';
import { throwFormula } from '../../../shared/vtt/throwRoll.js';
import { useRollChannel } from '../../../shared/cloud/useRollChannel.js';
import { sanitizeNoteText } from '../../../shared/vtt/drawing.js';
import { FEET_PER_CELL } from '../../../shared/vtt/measure.js';
import { useSceneLive } from '../../../shared/vtt/useSceneLive.js';
import { useSceneRole } from '../../../shared/vtt/useSceneRole.js';
import { useEncounterBridge } from '../hooks/useEncounterBridge.js';
import EncounterImportDialog from './EncounterImportDialog.jsx';
import MonsterPickerDialog from './MonsterPickerDialog.jsx';
import DiceToast from '../../../shared/character/DiceToast.jsx';
import RollLogPanel from './RollLogPanel.jsx';
import PlayerPanel from './PlayerPanel.jsx';
import RosterPanel from './RosterPanel.jsx';
import SceneToolRail from './SceneToolRail.jsx';
import MapCorner from './MapCorner.jsx';
import {
  DrawPanel,
  FogPanel,
  LaserPanel,
  LayerPanel,
  MeasurePanel,
} from './ScenePanels.jsx';
import SceneViewport from './SceneViewport.jsx';
import TokenMenu from './TokenMenu.jsx';

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

export default function SceneEditor({ scene, onSceneChange }) {
  const { notify } = useToast();
  const { user } = useAuth();
  const role = useSceneRole(scene.campaignId);
  const [tokens, setTokens] = useState([]);
  const [ghosts, setGhosts] = useState({});
  const [roster, setRoster] = useState([]);
  // What is actually on screen: the URL and the mode it belongs to, updated
  // together once the picture has loaded.
  const [displayed, setDisplayed] = useState({ url: null, shownImage: 'map' });
  const [selectedId, setSelectedId] = useState(null);
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
  const [menu, setMenu] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const [monsterOpen, setMonsterOpen] = useState(false);
  const [imageSize, setImageSize] = useState(null);
  const [tokenImageUrls, setTokenImageUrls] = useState({});
  const [drawings, setDrawings] = useState([]);
  const [drawColor, setDrawColor] = useState('#e8c96a');
  const [drawWidth, setDrawWidth] = useState(3);
  const [lasers, setLasers] = useState({});
  // Rolls said at the table. In memory only: a roll is an event, not a record.
  const [rollFeed, setRollFeed] = useState([]);
  // Your own roll, in the same panel the character sheet shows it in. Only your
  // own: everyone else's arrives as a bubble over their piece and a line in the
  // log, which is what the table needs to see.
  const [rollToast, setRollToast] = useState(null);
  // Stable, because the toast dismisses itself on a timer keyed to this
  // callback: a new function every render restarted the timer every render, and
  // the toast sat there for good.
  const dismissRollToast = useCallback(() => setRollToast(null), []);
  // Yours to clear, and only yours: the log was never anywhere but this page's
  // memory, so there is nothing to tell anybody else about.
  const clearRollFeed = useCallback(() => setRollFeed([]), []);
  const [rollTick, setRollTick] = useState(0);
  const [measureShape, setMeasureShape] = useState('line');
  const [feetPerCell, setFeetPerCell] = useState(FEET_PER_CELL);
  const [remoteMeasure, setRemoteMeasure] = useState(null);

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
      role.isGm ? listTokenSecrets(scene.id) : Promise.resolve({}),
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
  }, [notify, role.isGm, scene.campaignId, scene.id]);

  // Whichever of the two pictures the table is looking at. The other stays
  // uploaded and one click away.
  const shownPath = scene.shownImage === 'background' ? scene.backgroundPath : scene.imagePath;

  // The picture and everything that belongs to it change together. Flipping the
  // mode as soon as the row changed showed the switch in three steps: fog off,
  // bare map for a beat, then the background — and the reverse on the way back,
  // which briefly showed an uncovered battlemap to the whole table.
  useEffect(() => {
    let cancelled = false;
    if (!shownPath) {
      setDisplayed({ url: null, shownImage: scene.shownImage });
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
          .then(() => { if (!cancelled) setDisplayed({ url, shownImage: scene.shownImage }); });
      })
      .catch(() => { if (!cancelled) setDisplayed({ url: null, shownImage: scene.shownImage }); });
    return () => { cancelled = true; };
  }, [scene.shownImage, shownPath]);

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
    setDrawings((current) => (
      current.some((item) => item.id === drawing.id) ? current : [...current, drawing]
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

  const { sendDrag } = useSceneLive({
    sceneId: scene.id,
    campaignId: scene.campaignId,
    onTokenEvent: handleTokenEvent,
    onSceneEvent: handleSceneEvent,
    onRemoteDrag: handleRemoteDrag,
    onDrawingEvent: handleDrawingEvent,
    onCharacterEvent: handleCharacterEvent,
  });

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
      return { ...current, [id]: { x: point.x, y: point.y, at: Date.now(), label: null } };
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
    try {
      const path = await uploadMapImage(scene.campaignId, scene.id, file);
      onSceneChange(await updateScene(scene.id, {
        [slot === 'background' ? 'backgroundPath' : 'imagePath']: path,
        shownImage: slot,
      }));
    } catch (cause) {
      notify('error', cause?.message || 'Could not upload that image.');
    } finally {
      setBusy(false);
    }
  }, [notify, onSceneChange, scene.campaignId, scene.id]);

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
      setSelectedId(created.id);
    } catch (cause) {
      notify('error', cause?.message || 'Could not add that token.');
    } finally {
      setBusy(false);
    }
  }, [notify, scene.id]);

  const nextFreeCell = useCallback(() => {
    const taken = new Set(tokens.map((token) => `${Math.round(token.x)}:${Math.round(token.y)}`));
    for (let row = 0; row < 20; row += 1) {
      for (let col = 0; col < 20; col += 1) {
        if (!taken.has(`${col}:${row}`)) return { x: col, y: row };
      }
    }
    return { x: 0, y: 0 };
  }, [tokens]);

  // An extra picture is a piece, not a third slot: it can be moved, resized and
  // removed like everything else. It lands on the layer being edited — scenery
  // on the map layer, a handout among the tokens, something the party must not
  // see yet on the GM layer.
  const handleAddImage = useCallback(async (file) => {
    setBusy(true);
    try {
      const path = await uploadMapImage(scene.campaignId, scene.id, file);
      const created = await createToken(scene.id, {
        ...nextFreeCell(),
        layer: activeLayer,
        w: 4,
        h: 4,
        label: '',
        image_path: path,
      });
      setTokens((current) => [...current, created]);
    } catch (cause) {
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
  const handlePlaceMonster = useCallback(async (monster, count, { layer }) => {
    setBusy(true);
    try {
      const laid = layoutTokens(monsterGroupTokens(monster, count, { layer }), tokens);
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

  const handleImportEncounter = useCallback(async (combatants, { layer, instanceId, fightId }) => {
    setBusy(true);
    setImportOpen(false);
    try {
      const laid = layoutTokens(
        combatants.map((combatant) => combatantToToken(combatant, { layer, instanceId, fightId })),
        tokens,
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
          hpCurrent: update.hpCurrent,
          hpMax: update.hpMax,
          conditions: update.conditions,
          effects: update.effects,
        }
        : token;
    }));
    for (const update of updates) {
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
    tokens: role.isGm ? tokens : [],
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

  const handleMarkToken = useCallback(async (token, { conditions, showHp, effects }) => {
    // On a piece of their own, a player may also decide whether it wears a hit
    // point bar — that is an ordinary update the row policy already allows.
    const owned = canMove(token);
    setTokens((current) => current.map((item) => (
      item.id === token.id ? { ...item, conditions, ...(owned ? { showHp, effects } : {}) } : item
    )));
    try {
      await writeConditions(token, conditions);
      // Effects are an ordinary column, so a player may set them only on a piece
      // the row policy already lets them write.
      if (owned) await updateToken(token.id, { show_hp: showHp, effects });
      pushToEncounter({ ...token, conditions, effects });
    } catch (cause) {
      setTokens((current) => current.map((item) => (item.id === token.id ? token : item)));
      notify('error', cause?.message || 'Could not mark that token.');
    }
  }, [canMove, notify, pushToEncounter, writeConditions]);

  const handleSaveToken = useCallback(async (token, {
    label, gmOnly, conditions, hpCurrent, hpMax, showHp, effects,
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
          ...(token.characterId ? {} : { hpCurrent, hpMax }),
        }
        : item
    )));
    try {
      // Conditions take the route that suits the piece: a character's go to the
      // sheet, a monster's to its own row.
      await writeConditions(token, conditions);
      await updateToken(token.id, {
        label: publicLabel, effects, show_hp: showHp, ...vitals,
      });
      if (secret !== (token.secretLabel || '')) await setTokenSecret(token.id, secret);
      // Back to the encounter builder, if its tab is around to hear it. A
      // character's piece is matched to its combatant by the sheet it stands
      // for, so this is not limited to imported monsters.
      pushToEncounter({ ...token, hpCurrent, hpMax, conditions, effects });
    } catch (cause) {
      setTokens((current) => current.map((item) => (item.id === token.id ? token : item)));
      notify('error', cause?.message || 'Could not update that token.');
    }
  }, [notify]);

  const handleDeleteToken = useCallback(async (token) => {
    setBusy(true);
    try {
      await deleteToken(token.id);
      setTokens((current) => current.filter((item) => item.id !== token.id));
      setSelectedId(null);
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
    setRollFeed((current) => addRoll(current, entry));
    setRollToast(entry);
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

  const laserDots = useMemo(() => Object.values(lasers), [lasers]);

  // What the rail offers, in the order a session needs it. A player gets the two
  // groups that are theirs; the rest would only be buttons the database refuses.
  const toolGroups = useMemo(() => {
    const rollsGroup = {
      id: 'rolls',
      label: 'Rolls',
      icon: Dices,
      content: (
        <RollLogPanel
          feed={rollFeed}
          onCustomRoll={handleCustomRoll}
          onClear={clearRollFeed}
        />
      ),
    };

    const drawGroup = {
      id: 'draw',
      label: 'Draw',
      icon: Pencil,
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
            />
          ),
        },
        drawGroup,
        rollsGroup,
        {
          id: 'laser',
          label: 'Laser',
          icon: Pointer,
          content: <LaserPanel paintMode={paintMode} onPaintModeChange={setPaintMode} />,
        },
        {
          id: 'ruler',
          label: 'Measure',
          icon: Ruler,
          content: (
            <MeasurePanel
              paintMode={paintMode}
              rollBubbles={rollBubbles}
        diceThrows={diceThrows}
        measureShape={measureShape}
              feetPerCell={feetPerCell}
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
          />
        ),
      },
      drawGroup,
      rollsGroup,
      {
        id: 'laser',
        label: 'Laser',
        icon: Pointer,
        content: <LaserPanel paintMode={paintMode} onPaintModeChange={setPaintMode} />,
      },
      {
        id: 'ruler',
        label: 'Measure',
        icon: Ruler,
        content: (
          <MeasurePanel
            paintMode={paintMode}
            rollBubbles={rollBubbles}
        diceThrows={diceThrows}
        measureShape={measureShape}
            feetPerCell={feetPerCell}
            onPaintModeChange={setPaintMode}
            onShapeChange={setMeasureShape}
            onFeetPerCellChange={setFeetPerCell}
          />
        ),
      },
      {
        id: 'fog',
        label: 'Fog',
        icon: Cloud,
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
    handlePlaceCharacter, handlePlayAreaChange, handleUndoDrawing, handleUploadMap,
    handleUploadBackground, handleShownImageChange, handleAddImage, paintMode,
    role.isGm, role.ownedCharacterIds, roster, scene, tokens, measureShape, feetPerCell,
    rollFeed, handleCustomRoll, clearRollFeed,
  ]);

  const menuToken = useMemo(
    () => tokens.find((token) => token.id === menu?.tokenId) || null,
    [menu, tokens],
  );

  // While editing one layer, strokes on the others fade back rather than
  // disappear: they are context, and losing them would make the map unreadable
  // the moment you switch tools.
  const visibleDrawings = useMemo(() => (
    role.isGm
      ? drawings.map((drawing) => (
        drawing.layer === activeLayer ? drawing : { ...drawing, color: fade(drawing.color) }
      ))
      : drawings
  ), [activeLayer, drawings, role.isGm]);

  const visibleTokens = useMemo(
    // Sheet hit points are overlaid at render, never copied onto the row: the
    // character sheet stays the one place a character's HP lives.
    () => withSheetVitals(resolveTokens(tokens, ghosts, draggingRef.current), roster)
      .map((token) => (token.imagePath && tokenImageUrls[token.imagePath]
        ? { ...token, imageUrl: tokenImageUrls[token.imagePath] }
        : token)),
    [ghosts, roster, tokenImageUrls, tokens],
  );

  if (loading || role.loading) return <CircularProgress size={24} />;

  return (
    <Stack spacing={1}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexWrap: 'wrap' }} useFlexGap>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h1">{scene.name}</Typography>
          <Typography variant="body2" color="text.secondary">
            {tokens.length} token{tokens.length === 1 ? '' : 's'} · cell {scene.grid.size}px
          </Typography>
        </Box>
        <Chip
          size="small"
          icon={role.isGm ? <Shield size={13} /> : <Eye size={13} />}
          label={role.isGm ? 'GM' : 'Player view'}
          color={role.isGm ? 'primary' : 'default'}
          variant="outlined"
        />
        {role.isGm ? (
          <Chip
            size="small"
            icon={<Radio size={13} />}
            label={scene.isLive ? 'Live to players' : 'Not shown to players'}
            color={scene.isLive ? 'success' : 'default'}
            variant={scene.isLive ? 'filled' : 'outlined'}
            onClick={handleToggleLive}
          />
        ) : null}
      </Stack>

      <SceneViewport
        scene={scene}
        imageUrl={displayed.url}
        tokens={visibleTokens}
        selectedId={selectedId}
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
            <MapCorner
              scene={scene}
              busy={busy}
              onShownImageChange={handleShownImageChange}
              onUploadMap={handleUploadMap}
              onUploadBackground={handleUploadBackground}
              onAddImage={handleAddImage}
              onGridChange={handleGridChange}
              onPlayAreaChange={handlePlayAreaChange}
              onFitPlayArea={handleFitPlayArea}
            />
          )
          : null}
        onImageSize={setImageSize}
        onSelect={setSelectedId}
        onDragToken={handleDragToken}
        onMoveToken={handleMoveToken}
        onPaint={handlePaint}
        onPaintEnd={handlePaintEnd}
        onContextMenu={(token, at) => setMenu({ tokenId: token.id, at })}
        onDropCharacter={handleDropCharacter}
        drawings={visibleDrawings}
        drawColor={drawColor}
        drawWidth={drawWidth}
        onDrawEnd={handleDrawEnd}
        onErase={handleErase}
        onWriteNote={handleWriteNote}
        onLaser={handleLaser}
        lasers={laserDots}
        rollBubbles={rollBubbles}
        diceThrows={diceThrows}
        measureShape={measureShape}
        feetPerCellForRuler={feetPerCell}
        onMeasure={handleMeasure}
        remoteMeasure={remoteMeasure}
        feetPerCell={feetPerCell}
        controls={<SceneToolRail groups={toolGroups} />}
        // Inside the viewport, not beside it: a fullscreen map paints nothing
        // that is not one of its own descendants.
        toast={<DiceToast toast={rollToast} onClose={dismissRollToast} />}
        // Bottom left, opposite the fullscreen button: the layer you are editing
        // is a constant piece of state, not a setting you go and find.
        layerSwitch={role.isGm
          ? <LayerPanel compact activeLayer={activeLayer} onActiveLayerChange={setActiveLayer} />
          : null}
      />

      <MonsterPickerDialog
        open={monsterOpen}
        busy={busy}
        onClose={() => setMonsterOpen(false)}
        onPlace={handlePlaceMonster}
      />

      <EncounterImportDialog
        open={importOpen}
        busy={busy}
        onClose={() => setImportOpen(false)}
        onImport={handleImportEncounter}
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
        // Effects are an ordinary column on the piece, so they follow the row
        // policy: a player may set them on what they may already move. Offering
        // the chips on a monster would be a click that silently does nothing.
        canSetEffects={role.isGm || canMove(menuToken)}
        canRemove={role.isGm || canMove(menuToken)}
        onClose={() => setMenu(null)}
        onSave={role.isGm ? handleSaveToken : handleMarkToken}
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

// Half-transparent version of a stroke colour, for the layers not being edited.
function fade(color) {
  const hex = typeof color === 'string' && /^#[0-9a-f]{6}$/i.test(color) ? color : '#e8c96a';
  return `${hex}55`;
}

