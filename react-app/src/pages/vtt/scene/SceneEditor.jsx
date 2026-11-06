import {
  useCallback, useEffect, useMemo, useRef, useState,
} from 'react';
import {
  Box,
  CircularProgress,
  Stack,
} from '@mui/material';
import { useToast } from '../../../shared/ui/ToastProvider.jsx';
import { useAuth } from '../../../shared/cloud/auth/AuthProvider.jsx';
import { commandCharacterVitals } from '../../../shared/cloud/api/cloudCharacters.js';
import { fetchScene, fetchSceneRevision } from '../../../shared/cloud/api/vttScenes.js';
import { applyTokenEvent } from '../../../shared/vtt/session/liveScene.js';
import {
  canMarkToken,
  sceneBackgrounds,
  sceneView,
  toScene,
  viewBackgroundPath,
} from '../../../shared/vtt/scene/scene.js';
import { DEFAULT_AREA_OPTIONS } from '../../../shared/vtt/map/areas.js';
import { FEET_PER_CELL } from '../../../shared/vtt/map/measure.js';
import { VTT_COLORS } from '../../../shared/vtt/colors.js';
import { isHexGrid } from '../../../shared/vtt/map/hexGeometry.js';
import { useSceneLive } from '../../../shared/vtt/session/useSceneLive.js';
import { useSceneRole } from '../../../shared/vtt/session/useSceneRole.js';
import { sheetGridColumns } from '../../../shared/vtt/sheets/sheetLayout.js';
import { useGmTokenVitals } from '../tokens/useGmTokenVitals.js';
import { useSceneHexcrawl } from '../hexcrawl/useSceneHexcrawl.js';
import { useSceneTurns } from '../initiative/useSceneTurns.js';
import InitiativeStrip from '../initiative/InitiativeStrip.jsx';
import MonsterStatBlockView from '../tokens/MonsterStatBlockView.jsx';
import { useSceneDungeon } from '../dungeon/useSceneDungeon.js';
import { useSceneContent } from './useSceneContent.js';
import { useCampaignRoster } from './useCampaignRoster.js';
import { useVttRolls } from '../rolls/useVttRolls.js';
import { useMonsterDb } from '../../../shared/bestiary/useMonsterDb.js';
import { parseSourceRef } from '../../../shared/vtt/tokens/encounterSync.js';
import {
  showsFight,
} from '../../../shared/vtt/tokens/initiative.js';
import HexcrawlCorner from '../hexcrawl/HexcrawlCorner.jsx';
import HexResultDialog from '../hexcrawl/HexResultDialog.jsx';
import { useConditionEntries } from '../../../shared/character/combat/useConditionEntries.js';
import EncounterImportDialog from '../tokens/EncounterImportDialog.jsx';
import MonsterPickerDialog from '../tokens/MonsterPickerDialog.jsx';
import DiceToast from '../../../shared/character/dice/DiceToast.jsx';
import RollsButton from '../rolls/RollsButton.jsx';
import SceneToolRail from './SceneToolRail.jsx';
import MapCorner from './MapCorner.jsx';
import BackgroundStrip from './BackgroundStrip.jsx';
import BattleMapSheetResizeHandle from '../sheets/BattleMapSheetResizeHandle.jsx';
import {
  contentLayoutOpenSx,
  contentLayoutSx,
  editorRootSx,
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
import SceneTopBar from './SceneTopBar.jsx';
import EmbeddedBattleMapSheet from './EmbeddedBattleMapSheet.jsx';
import { useProjectorControls, useProjectorFollow } from './useProjector.js';
import { useSheetSelection, useSheetSplit } from './useSceneSheets.js';
import { useDisplayedImage } from './useDisplayedImage.js';
import { useRemotePreviews } from './useRemotePreviews.js';
import { useFogPainting, useFogReceiver } from './useFogPainting.js';
import { useSceneWriteGuard } from './useSceneWriteGuard.js';
import { useTokenMoves } from './useTokenMoves.js';
import { usePlayArea } from './usePlayArea.js';
import { useSceneHeaderActions } from './useSceneHeaderActions.js';
import { useViewerProjection } from './useViewerProjection.js';

// The GM needs to see what is still hidden from the party without being blind
// to the map underneath; a player gets the real thing.
const GM_FOG_OPACITY = 0.55;
const PLAYER_FOG_OPACITY = 1;

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
  const [busy, setBusy] = useState(false);
  // The piece this screen is dragging: the realtime handler leaves its row
  // alone, and the board shows it under the pointer rather than at its ghost.
  const draggingRef = useRef(null);
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
  // The floating sheet of a fullscreen board, held here so a creature clicked
  // on that board can open its stat block in it.
  const [floatingSheetOpen, setFloatingSheetOpen] = useState(false);
  const contentLayoutRef = useRef(null);
  const [measureShape, setMeasureShape] = useState('line');
  const [feetPerCell, setFeetPerCell] = useState(FEET_PER_CELL);
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

  const projector = useProjectorFollow({
    scene, role, spectator, spectatorSource, cameraSourceId, presenterFollowingRef, presenterWindowRef,
  });
  const {
    projectorFollowingRef, projectorFollowing, projectorAttached, projectorControlsOpen,
    followCameraPose, projectorView, gmView, setGmView, projectorInspection,
  } = projector;

  const { sheetSplit, commitSheetSplit } = useSheetSplit(user?.id);

  // Whichever picture this client is looking at: the battlemap or one of the
  // backgrounds. The others stay uploaded and one click away.
  const viewForViewport = spectator
    ? projectorView
    : role.isGm && !gmPlayerPreview ? gmView : sceneView(scene);
  const shownImageForViewport = viewForViewport.shownImage;
  // Resolved against the scene's list: a view pointing at a background removed
  // since falls back instead of going blank.
  const backgroundForViewport = viewBackgroundPath(scene, viewForViewport);
  const { viewportDisplay, repairImage } = useDisplayedImage({ scene, view: viewForViewport, notify });

  useEffect(() => {
    if (!role.isGm) setGmPlayerPreview(false);
  }, [role.isGm]);

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
    ...projector.liveOptions,
    onReconcile: reconcilePersistentState,
  });

  const {
    handleTokenInspection, handleCameraViewChange, handleToggleProjectorFollow, openSpectator, stopProjector,
  } = useProjectorControls({
    projector, scene, role, spectator, onSceneChange, notify, noteSceneWrite,
    sendCamera, sendPresenterState, sendPresenterInspection,
  });

  const {
    canMove, handleDragToken, handleMoveToken, handleMoveTokens, handleObjectStyle, handleTokenVisibility,
  } = useTokenMoves({
    playArea: scene.playArea, role, activeLayer, userId: user?.id, setTokens, beginTokenMove,
    draggingRef, sendDrag, notify,
  });

  const {
    savePlayArea, handleGridChange, handleAtmosphereChange, handleImageFilterChange,
    viewportImageFilter, viewportAtmosphere,
  } = useSceneSettings({
    scene, onSceneChange, role, spectator, notify, beginSceneEdit, noteSceneWrite,
    imageSize, shownImageForViewport, viewportDisplay, sendDrag,
  });

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

  const { handleToggleLive, handleRename } = useSceneHeaderActions({ scene, onSceneChange, notify });

  const { fogCells, handlePlayAreaChange, handleFitPlayArea } = usePlayArea({
    scene, onSceneChange, savePlayArea, imageSize, role, spectator, shownImageForViewport,
  });

  const {
    handlePaint, handlePaintEnd, handleEnableFog, handleFogAll,
  } = useFogPainting({
    scene, onSceneChange, paintingRef, fogCells, sendDrag, noteSceneWrite, notify, setPaintMode,
  });

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

  const {
    visibleDrawings, visibleTokens, projectedTokens, projectedRollBubbles, projectedDiceThrows,
    projectedHexCells,
  } = useViewerProjection({
    spectator, gmPlayerPreview, role, activeLayer, drawings, tokens, ghosts, draggingRef, gmVitals,
    roster, tokenImageUrls, playArea: scene.playArea, rollBubbles, diceThrows, hexcrawl,
  });

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

  // The menu must edit the same character state the piece displays. The raw
  // map row deliberately has no sheet-owned HP or death saves, so using it here
  // made a dead character look like 0/0 and an innocent blur could write that
  // stale value back to the sheet.
  const menuToken = useMemo(
    () => visibleTokens.find((token) => token.id === menu?.tokenId) || null,
    [menu, visibleTokens],
  );

  const {
    sheetChoices, sheetCharacterId, showsStatBlock, sheetAreaSelectedId, hasSheetContent,
    sideSheetOpen, selectSheetCharacter, openCharacterSheet, handleTokenClick,
  } = useSheetSelection({
    roster, role, statBlock, statBlockRef, setStatBlockRef, statBlockOpenedAreaRef, openStatBlock,
    contentView, setContentView, mapFullscreen, gmPlayerPreview, setFloatingSheetOpen,
  });
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
      <SceneTopBar
        scene={scene}
        role={role}
        onOpenScene={onOpenScene}
        gmPlayerPreview={gmPlayerPreview}
        handleRename={handleRename}
        handleToggleLive={handleToggleLive}
        handleTogglePlayerPreview={handleTogglePlayerPreview}
        projectorAttached={projectorAttached}
        projectorControlsOpen={projectorControlsOpen}
        projectorFollowing={projectorFollowing}
        handleToggleProjectorFollow={handleToggleProjectorFollow}
        openSpectator={openSpectator}
        stopProjector={stopProjector}
        gmTurnView={gmTurnView}
        initiativeEntries={initiativeEntries}
        initiativeChoices={initiativeChoices}
        handleChooseFight={handleChooseFight}
        contentView={contentView}
        setContentView={setContentView}
        hasSheetContent={hasSheetContent}
        sheetChoices={sheetChoices}
        sheetAreaSelectedId={sheetAreaSelectedId}
        selectSheetCharacter={selectSheetCharacter}
      />

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
