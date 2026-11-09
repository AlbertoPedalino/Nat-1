import { useMemo, useRef, useState } from 'react';
import { Box, Stack } from '@mui/material';
import { useToast } from '../../../shared/ui/ToastProvider.jsx';
import { useAuth } from '../../../shared/cloud/auth/AuthProvider.jsx';
import {
  sceneBackgrounds,
  sceneView,
  viewBackgroundPath,
} from '../../../shared/vtt/scene/scene.js';
import { gridShape } from '../../../shared/vtt/map/hexGeometry.js';
import { useSceneRole } from '../../../shared/vtt/session/useSceneRole.js';
import { sheetGridColumns } from '../../../shared/vtt/sheets/sheetLayout.js';
import InitiativeStrip from '../initiative/InitiativeStrip.jsx';
import MonsterStatBlockView from '../tokens/MonsterStatBlockView.jsx';
import { useSceneContent } from './useSceneContent.js';
import { useVttRolls } from '../rolls/useVttRolls.js';
import GmRollsShownSwitch from '../../../shared/character/dice/GmRollsShownSwitch.jsx';
import {
  showsFight,
} from '../../../shared/vtt/tokens/initiative.js';
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
  GM_FOG_OPACITY,
  PLAYER_FOG_OPACITY,
  sheetViewSx,
  viewportCellSx,
} from './sceneEditorStyles.js';
import {
  CursorPanel,
  LayerPanel,
} from './ScenePanels.jsx';
import SceneViewport from '../map/SceneViewport.jsx';
import DrawingMenu from '../map/DrawingMenu.jsx';
import { allowedPaintModeFor, buildToolGroups, paintToolGroup } from './sceneToolGroups.jsx';
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
import { useFogPainting } from './useFogPainting.js';
import { useTokenMoves } from './useTokenMoves.js';
import { usePlayArea } from './usePlayArea.js';
import { useSceneHeaderActions } from './useSceneHeaderActions.js';
import { useViewerProjection } from './useViewerProjection.js';
import { useSceneSources } from './useSceneSources.js';
import { useSceneSync } from './useSceneSync.js';
import { usePlayerPreview } from './usePlayerPreview.js';
import { useSceneTools } from './useSceneTools.js';
import { viewportEdits } from './viewportEdits.js';
import { useMapFullscreen } from './useMapFullscreen.js';
import SceneHexcrawlCorner from './SceneHexcrawlCorner.jsx';
import SceneTokenMenu from './SceneTokenMenu.jsx';
import SpectatorSceneView from './SpectatorSceneView.jsx';
import { LoadingLine } from '../../../shared/ui/LoadStatus.jsx';

// The hub of a scene: it reads the scene's sources, wires the editing hooks to
// them and hands the result to the board. Each concern lives in its own hook;
// what is left here is the wiring between them.
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
  const {
    roster, rosterDigests, characterHealth, gmVitals, sceneTurns, hexcrawl, monsterDb, dungeon,
  } = useSceneSources({ scene, tokens, gmWindow: role.isGm && !spectator });
  const [busy, setBusy] = useState(false);
  // The piece this screen is dragging: the realtime handler leaves its row
  // alone, and the board shows it under the pointer rather than at its ghost.
  const draggingRef = useRef(null);
  const {
    gmPlayerPreview, handleTogglePlayerPreview,
    paintMode, setPaintMode, openCorner, setOpenCorner, menu, setMenu,
    importOpen, setImportOpen, monsterOpen, setMonsterOpen, placementDrag, setPlacementDrag,
    selectedDrawingId, setSelectedDrawingId, contentView, setContentView,
  } = usePlayerPreview({ isGm: role.isGm });
  // The GM editing the scene (not looking through the player preview).
  const gmEditing = role.isGm && !gmPlayerPreview;
  const {
    brushSize, setBrushSize, activeLayer, setActiveLayer, drawColor, setDrawColor, drawWidth, setDrawWidth,
    areaOptions, setAreaOptions, measureShape, setMeasureShape, feetPerCell, setFeetPerCell,
  } = useSceneTools();
  const [imageSize, setImageSize] = useState(null);
  const {
    mapFullscreen, handleMapFullscreenChange, floatingSheetOpen, setFloatingSheetOpen,
  } = useMapFullscreen(onMapFullscreenChange);
  const contentLayoutRef = useRef(null);
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
    : gmEditing ? gmView : sceneView(scene);
  const shownImageForViewport = viewForViewport.shownImage;
  // Resolved against the scene's list: a view pointing at a background removed
  // since falls back instead of going blank.
  const backgroundForViewport = viewBackgroundPath(scene, viewForViewport);
  const { viewportDisplay, repairImage } = useDisplayedImage({ scene, view: viewForViewport, notify });

  const {
    ghosts, setLasers, laserDots, remoteMeasure, paintingRef, beginSceneEdit, noteSceneWrite,
    sendDrag, sendCamera, sendPresenterState, sendPresenterInspection,
  } = useSceneSync({
    scene, role, roster, onSceneChange, setTokens, draggingRef, movingTokenIds, refreshVisibleTokens,
    reconcileContent, handleDrawingEvent, repairImage, gmVitals, sceneTurns,
    liveOptions: projector.liveOptions,
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

  const allowedPaintMode = useMemo(
    () => allowedPaintModeFor(paintMode, { isGm: role.isGm, shownImage: shownImageForViewport }),
    [paintMode, role.isGm, shownImageForViewport],
  );

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
          campaignId={scene.campaignId}
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

  // What the viewport may change, and how: none of it in the GM's player
  // preview (viewportEdits.js).
  const viewportEditProps = viewportEdits(gmPlayerPreview, {
    canMove,
    selectedHex: hexcrawl.selected,
    onHexClick: hexcrawl.enabled ? hexcrawl.clickHex : undefined,
    hexBubble: hexcrawl.enabled ? hexcrawl.bubble : null,
    onHexBubbleClose: hexcrawl.dismissBubble,
    onDragToken: handleDragToken,
    onMoveToken: handleMoveToken,
    onMoveTokens: handleMoveTokens,
    onDeleteTokens: handleDeleteTokens,
    onResizeToken: handleMoveToken,
    onRotateToken: handleMoveToken,
    canSetDeathSaves: (token) => role.isGm || canMove(token),
    onDeathSaveChange: handleDeathSaveChange,
    onPaint: handlePaint,
    onPaintEnd: handlePaintEnd,
    onContextMenu: (token, at) => setMenu({ tokenId: token.id, at }),
    onDropCharacter: handleDropCharacter,
    placementDrag,
    onDropPlacement: handleDropPlacement,
    movableDrawing,
    selectedDrawingId,
    onSelectDrawing: setSelectedDrawingId,
    onMoveDrawing: handleMoveDrawing,
    onDrawEnd: handleDrawEnd,
    onErase: handleErase,
    onWriteNote: handleWriteNote,
    onPlaceArea: handlePlaceArea,
    drawingForMenu,
    onDrawingMenu: (drawing, at) => setDrawingMenu({ drawingId: drawing.id, at }),
    onLaser: handleLaser,
    onMeasure: handleMeasure,
    // On the map, not in the scene bar, so fullscreen keeps it too.
    rolls: (
      <RollsButton
        feed={rollFeed}
        onCustomRoll={handleCustomRoll}
        onClear={clearRollFeed}
        settings={role.isGm ? <GmRollsShownSwitch campaignId={scene.campaignId} /> : null}
      />
    ),
    controls: (
      <SceneToolRail
        groups={toolGroups}
        activeId={paintToolGroup(allowedPaintMode)}
        onCursor={() => setPaintMode('select')}
        cursorContent={<CursorPanel paintMode={allowedPaintMode} onPaintModeChange={setPaintMode} />}
        placing={Boolean(placementDrag)}
      />
    ),
    fullscreenSheet: hasSheetContent ? {
      choices: sheetChoices,
      selectedId: sheetAreaSelectedId,
      onSelectionChange: selectSheetCharacter,
      open: floatingSheetOpen,
      onOpenChange: setFloatingSheetOpen,
      content: sheetAreaContent('floating'),
    } : null,
  });

  if (loading || role.loading) return <LoadingLine centered label="Loading scene…" />;

  if (spectator) {
    return (
      <SpectatorSceneView
        scene={scene}
        viewportDisplay={viewportDisplay}
        tokens={projectedTokens}
        atmosphere={viewportAtmosphere}
        imageFilter={viewportImageFilter}
        hexCells={projectedHexCells}
        partyHex={hexcrawl.partyHex}
        onImageSize={setImageSize}
        drawings={visibleDrawings}
        lasers={laserDots}
        rollBubbles={projectedRollBubbles}
        diceThrows={projectedDiceThrows}
        conditionEntries={conditionEntries}
        presentedInspection={projectorInspection}
        initiativeEntries={initiativeEntries}
        initiativeRound={initiativeRound}
        remoteMeasure={remoteMeasure}
        feetPerCell={feetPerCell}
        followView={followCameraPose}
      />
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
        {...viewportEditProps}
        imageUrl={viewportDisplay.url}
        preparedImageSize={viewportDisplay.imageSize}
        tokens={gmPlayerPreview ? projectedTokens : visibleTokens}
        snap
        fog={scene.fog}
        atmosphere={viewportAtmosphere}
        imageFilter={viewportImageFilter}
        fogOpacity={gmEditing ? GM_FOG_OPACITY : PLAYER_FOG_OPACITY}
        fogOnTop={!role.isGm || gmPlayerPreview}
        canSeeThroughFog={!role.isGm ? canMove : undefined}
        // Fog brushes are the GM's; drawing is everyone's, so a player keeps
        // the pencil and the eraser and loses only reveal/hide.
        paintMode={gmPlayerPreview ? 'select' : allowedPaintMode}
        brushSize={brushSize}
        activeLayer={gmEditing ? activeLayer : null}
        showPlayArea={gmEditing}
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
        imageSwitch={gmEditing
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
                <SceneHexcrawlCorner
                  hexcrawl={hexcrawl}
                  grid={scene.grid}
                  onGridChange={handleGridChange}
                  open={openCorner === 'hexcrawl'}
                  onOpenChange={(next) => setOpenCorner(next ? 'hexcrawl' : null)}
                />
              ) : null}
            </Stack>
          )
          : null}
        // Painted for everyone at the table; only the GM may click one.
        hexCells={projectedHexCells}
        partyHex={hexcrawl.partyHex}
        onImageSize={setImageSize}
        drawings={visibleDrawings}
        drawColor={drawColor}
        drawWidth={drawWidth}
        areaOptions={areaOptions}
        lasers={laserDots}
        rollBubbles={gmPlayerPreview ? projectedRollBubbles : rollBubbles}
        onRollBubbleDismiss={dismissRollBubble}
        diceThrows={gmPlayerPreview ? projectedDiceThrows : diceThrows}
        measureShape={measureShape}
        feetPerCellForRuler={feetPerCell}
        conditionEntries={conditionEntries}
        onTokenInspection={gmEditing ? handleTokenInspection : undefined}
        remoteMeasure={remoteMeasure}
        feetPerCell={feetPerCell}
        // Inside the viewport, not beside it: a fullscreen map paints nothing
        // that is not one of its own descendants.
        toast={<DiceToast toast={rollToast} onClose={dismissRollToast} />}
        onFullscreenChange={handleMapFullscreenChange}
        onViewChange={gmEditing ? handleCameraViewChange : undefined}
        viewCenterRef={viewCenterRef}
        // Bottom left, opposite the fullscreen button: the layer you are editing
        // is a constant piece of state, not a setting you go and find.
        layerSwitch={gmEditing
          ? <LayerPanel compact activeLayer={activeLayer} onActiveLayerChange={setActiveLayer} />
          : null}
        backgroundStrip={gmEditing && shownImageForViewport === 'background'
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
          gridShape={gridShape(scene.grid)}
          onClose={() => setDrawingMenu(null)}
          onPreview={handlePreviewDrawing}
          onSave={handleSaveDrawing}
          onVisibility={role.isGm ? handleDrawingVisibility : undefined}
          onDelete={removeDrawing}
        />
      ) : null}

      {!gmPlayerPreview ? (
        <SceneTokenMenu
          menu={menu}
          onClose={() => setMenu(null)}
          visibleTokens={visibleTokens}
          role={role}
          canMove={canMove}
          onSaveToken={handleSaveToken}
          onMarkToken={handleMarkToken}
          onTokenVitals={handleTokenVitals}
          onObjectStyle={handleObjectStyle}
          onTokenVisibility={handleTokenVisibility}
          onDeleteToken={handleDeleteToken}
          gmTurnView={gmTurnView}
          statBlockFor={statBlockFor}
          openStatBlock={openStatBlock}
          sheetChoices={sheetChoices}
          openCharacterSheet={openCharacterSheet}
        />
      ) : null}
    </Stack>
  );
}
