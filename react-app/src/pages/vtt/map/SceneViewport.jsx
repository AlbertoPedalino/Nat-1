import { useMemo, useRef, useState } from 'react';
import { Box } from '@mui/material';
import { cellSize } from '../../../shared/vtt/map/geometry.js';
import {
  gridLineColor,
  normalizeGridLineWidth,
} from '../../../shared/vtt/scene/scene.js';
import { isMapPiece } from '../../../shared/vtt/map/mapObjects.js';
import { isHexGrid } from '../../../shared/vtt/map/hexGeometry.js';
import DrawingCanvas from './DrawingCanvas.jsx';
import AreaEffectsCanvas from './AreaEffectsCanvas.jsx';
import FogCanvas from './FogCanvas.jsx';
import LaserOverlay from './LaserOverlay.jsx';
import TokenLayer from '../tokens/TokenLayer.jsx';
import AtmosphereOverlay from '../atmosphere/AtmosphereOverlay.jsx';
import { imageFilterLook } from '../../../shared/vtt/scene/imageFilters.js';
import DeletePiecesDialog from '../tokens/DeletePiecesDialog.jsx';
import {
  brushRadiusFor,
  cursorFor,
  hexPlayAreaLayout,
  measurementBadge,
} from './viewportGeometry.js';
import {
  coveringSx,
  hostSx,
  fillViewportSx,
  placementTargetSx,
  placementTargetHintSx,
  selectionMarqueeSx,
} from './sceneViewportStyles.js';
import MapBackdrop from './MapBackdrop.jsx';
import { useViewportCamera } from './useViewportCamera.js';
import { usePinchZoom } from './usePinchZoom.js';
import { useGestureAbandon } from './useGestureAbandon.js';
import { useViewportPointer } from './useViewportPointer.js';
import { useViewportSelection } from './useViewportSelection.js';
import { useViewportFullscreen } from './useViewportFullscreen.js';
import { useRuler } from './useRuler.js';
import { useLaserPointer } from './useLaserPointer.js';
import { useFogBrush } from './useFogBrush.js';
import { useDrawingTools } from './useDrawingTools.js';
import { usePiecePlacement } from './usePiecePlacement.js';
import { useTokenGestures } from './useTokenGestures.js';
import { useMarkGestures } from './useMarkGestures.js';
import {
  BrushPreview, DistanceBadge, PlacementPreview,
} from './ViewportOverlays.jsx';
import { SelectionToolbar } from './ViewportControls.jsx';
import ViewportChrome from './ViewportChrome.jsx';
import ViewportCallouts from './ViewportCallouts.jsx';

// Rendering is hybrid by design: the map is an <img>, tokens are DOM nodes moved
// with `transform`, and only the fog (phase 4) will need a canvas. With the
// 20-30 pieces a scene actually holds, DOM tokens keep hover, keyboard focus and
// MUI styling for free.
export default function SceneViewport({
  scene,
  imageUrl,
  tokens,
  snap,
  canMove,
  fog,
  atmosphere,
  // The light filter of the picture on show (`imageFilters.js`): it tints the
  // picture only, never what stands on it.
  imageFilter = null,
  fogOpacity = 1,
  fogOnTop = false,
  canSeeThroughFog,
  paintMode = 'select',
  brushSize = 3,
  feetPerCell,
  activeLayer,
  showPlayArea = false,
  // Background mode is a picture on a screen, not a board: the party is meant to
  // look at it, not play on it.
  backgroundOnly = false,
  preparedImageSize = null,
  onImageSize,
  onDragToken,
  onMoveToken,
  onMoveTokens,
  onDeleteTokens,
  onResizeToken,
  onRotateToken,
  canSetDeathSaves,
  onDeathSaveChange,
  onPaint,
  onPaintEnd,
  onContextMenu,
  onDropCharacter,
  placementDrag,
  onDropPlacement,
  // Hexcrawl. A Map keyed by `hexKey`, so painting a hex is a lookup rather than
  // a scan of every cell the campaign has ever recorded.
  hexCells = null,
  selectedHex = null,
  partyHex = null,
  onHexClick,
  // What the last entered hex answered, spoken over that hex until it fades.
  hexBubble = null,
  onHexBubbleClose,
  drawings,
  movableDrawing,
  selectedDrawingId,
  onSelectDrawing,
  onMoveDrawing,
  drawColor,
  drawWidth,
  onDrawEnd,
  onErase,
  onWriteNote,
  // The area tool: what to place ({shape, filled, effect, breadthFt, label});
  // its size is dragged out. Where it goes when the button is released.
  areaOptions,
  onPlaceArea,
  // A mark's menu: which mark is under a point, and opening it there.
  drawingForMenu,
  onDrawingMenu,
  onLaser,
  lasers,
  rollBubbles,
  onRollBubbleDismiss,
  diceThrows,
  conditionEntries,
  presentedInspection,
  onTokenInspection,
  measureShape,
  feetPerCellForRuler,
  onMeasure,
  remoteMeasure,
  controls,
  // The rolls button, shown just left of the tools toggle in the top right.
  rolls = null,
  layerSwitch,
  imageSwitch,
  // Bottom centre: the GM's slider through the scene's backgrounds.
  backgroundStrip = null,
  // The turn order; it places itself (top centre) and is a viewport control.
  initiative = null,
  // A mouse click on a piece that did not move it (a touch tap keeps opening
  // its marks, and a long press its menu).
  onTokenClick = null,
  toast,
  fullscreenSheet,
  onFullscreenChange,
  followView,
  onViewChange,
  // Filled with a function answering the cell at the middle of this view, for
  // pieces placed with a click rather than dragged to a spot.
  viewCenterRef,
  cameraLocked = false,
  fillViewport = false,
  showFullscreenControl = true,
}) {
  const hostRef = useRef(null);
  const [loadedImageSize, setLoadedImageSize] = useState(null);
  // SceneEditor decodes each replacement before exposing it and supplies its
  // dimensions in the same render as the URL. This prevents one paint with the
  // previous picture's fit while the new <img> waits to emit `load`.
  const imageSize = preparedImageSize || loadedImageSize;
  const imageLook = useMemo(() => imageFilterLook(imageFilter), [imageFilter]);

  const {
    view, setView, viewportSize, constrainView, screenPoint, cellPoint,
  } = useViewportCamera({
    hostRef,
    grid: scene.grid,
    imageSize,
    imageUrl,
    backgroundOnly,
    cameraLocked,
    followView,
    onViewChange,
    viewCenterRef,
  });
  const { pointersRef, trackPointer, trackPointerMove } = usePinchZoom({
    hostRef, cameraLocked, setView, constrainView,
  });

  // The gesture under way, whichever tool or piece started it: `kind` says
  // which of the handlers below carries it on.
  const dragRef = useRef(null);
  // The piece being dragged, applied at render so it follows the pointer
  // without a write per frame.
  const [drag, setDrag] = useState(null);
  // The mark being dragged, as an offset in cells: applied at render so the
  // stroke follows the pointer without a write per frame.
  const [markDrag, setMarkDrag] = useState(null);
  // Scenery follows the scene's own switch; a creature keeps its square whatever
  // that switch says, which is the whole reason the setting is not global.
  const snapObjects = scene.grid?.snapObjects !== false;
  const snapFor = (token) => (isMapPiece(token) ? snap && snapObjects : snap);

  const {
    abandonGesture, armLongPress, cancelLongPress, cancelLongPressIfMoved,
  } = useGestureAbandon({
    dragRef, onDragToken, onPaintEnd, setDrag, setMarkDrag,
  });

  const selection = useViewportSelection({
    hostRef,
    dragRef,
    tokens,
    activeLayer,
    canMove,
    grid: scene.grid,
    view,
    screenPoint,
    paintMode,
    backgroundOnly,
    snapFor,
    onDeleteTokens,
    onMoveTokens,
  });
  const { selectedTokenIds, setSelectedMapObjectId } = selection;
  const {
    covering, fullscreenActive, toggleFullscreen, floatingSheetOpen, setFloatingSheetOpen,
  } = useViewportFullscreen({ hostRef, fullscreenSheet, onFullscreenChange });
  const ruler = useRuler({
    dragRef, paintMode, cellPoint, grid: scene.grid, measureShape, feetPerCellForRuler, onMeasure,
  });
  const laser = useLaserPointer({ paintMode, onLaser });
  const fogBrush = useFogBrush({
    dragRef, view, grid: scene.grid, fog, brushSize, paintMode, onPaint, onPaintEnd,
  });
  const drawingTools = useDrawingTools({
    dragRef,
    cellPoint,
    grid: scene.grid,
    paintMode,
    areaOptions,
    feetPerCellForRuler,
    drawColor,
    drawWidth,
    onDrawEnd,
    onErase,
    onWriteNote,
    onPlaceArea,
  });
  const { placementHover, dragHandlers } = usePiecePlacement({
    hostRef,
    view,
    grid: scene.grid,
    screenPoint,
    cellPoint,
    snapObjects,
    placementDrag,
    backgroundOnly,
    onDropPlacement,
    onDropCharacter,
  });
  const tokenGestures = useTokenGestures({
    dragRef,
    pointersRef,
    view,
    grid: scene.grid,
    screenPoint,
    paintMode,
    canMove,
    snapFor,
    setDrag,
    armLongPress,
    setSelectedMapObjectId,
    beginGroupDrag: selection.beginGroupDrag,
    onContextMenu,
    onDragToken,
    onMoveToken,
    onResizeToken,
    onRotateToken,
    onTokenClick,
  });
  const marks = useMarkGestures({
    dragRef,
    cellPoint,
    screenPoint,
    armLongPress,
    markDrag,
    setMarkDrag,
    drawings,
    movableDrawing,
    selectedDrawingId,
    onSelectDrawing,
    onMoveDrawing,
    drawingForMenu,
    onDrawingMenu,
  });

  const {
    hover, abandonForPinch, beginPan, handlePointerMove, handlePointerUp, handlePointerLeave,
  } = useViewportPointer({
    hostRef, dragRef, pointersRef, scene, view, imageSize, paintMode, backgroundOnly, cameraLocked,
    screenPoint, cellPoint, setView, constrainView, setDrag, setMarkDrag,
    abandonGesture, cancelLongPress, cancelLongPressIfMoved,
    // The tools a gesture is handed to.
    selection, marks, fogBrush, drawingTools, ruler, laser, tokenGestures,
    onHexClick, onSelectDrawing,
  });

  const size = cellSize(scene.grid) * view.zoom;
  const gridVisible = !backgroundOnly && scene.grid.visible && size > 4;
  const picksHex = Boolean(onHexClick) && !backgroundOnly && isHexGrid(scene.grid);
  const gridColor = gridLineColor(scene.grid);
  const gridLine = normalizeGridLineWidth(scene.grid.lineWidth);
  const measured = measurementBadge(tokens, drag, scene.grid, view, feetPerCell);
  const brushRadius = brushRadiusFor(paintMode, { brushSize, drawWidth, cell: size, fogScale: Math.max(1, fog?.scale || 1) });
  const { hexMapBox, hexPlayAreaMatchesMap, hexPlayAreaClip } = hexPlayAreaLayout(scene, view, imageSize);
  const { shownDrawings } = marks;
  const { selectionBox } = selection;

  return (
    <Box
      ref={hostRef}
      tabIndex={-1}
      onPointerDownCapture={(event) => trackPointer(event, abandonForPinch)}
      onPointerMoveCapture={trackPointerMove}
      onPointerDown={beginPan}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      onContextMenu={marks.handleContextMenu}
      {...dragHandlers}
      sx={{
        ...hostSx,
        ...(fillViewport ? fillViewportSx : null),
        ...(covering ? coveringSx : null),
        ...(placementDrag && !backgroundOnly ? placementTargetSx : null),
        cursor: cameraLocked ? 'default' : cursorFor(paintMode, { picksHex }),
      }}
    >
      {placementDrag && !backgroundOnly ? (
        <Box data-placement-target-hint sx={placementTargetHintSx}>
          Release on the map to place
        </Box>
      ) : null}
      <MapBackdrop
        scene={scene}
        view={view}
        size={size}
        imageUrl={imageUrl}
        imageSize={imageSize}
        imageLook={imageLook}
        onImageSize={onImageSize}
        setLoadedImageSize={setLoadedImageSize}
        backgroundOnly={backgroundOnly}
        gridVisible={gridVisible}
        gridColor={gridColor}
        gridLine={gridLine}
        selectedHex={selectedHex}
        hexCells={hexCells}
        showPlayArea={showPlayArea}
        hexMapBox={hexMapBox}
        hexPlayAreaClip={hexPlayAreaClip}
        hexPlayAreaMatchesMap={hexPlayAreaMatchesMap}
        viewportSize={viewportSize}
      />

      {/* Committed strokes go under the fog: a note scribbled on a room the
          party has not reached is the GM's business until they get there. The
          live stroke, the ruler and the laser go over everything — see below. */}
      {/* Under the marks, so an area's outline and label stay on top of its
          flames; under the fog, like the marks. */}
      <AreaEffectsCanvas
        drawings={backgroundOnly ? null : shownDrawings}
        grid={scene.grid}
        view={view}
      />
      <DrawingCanvas
        drawings={backgroundOnly ? null : shownDrawings}
        selectedId={backgroundOnly ? null : selectedDrawingId}
        grid={scene.grid}
        view={view}
      />

      <FogCanvas fog={backgroundOnly ? null : fog} grid={scene.grid} view={view} opacity={fogOpacity} onTop={fogOnTop} />

      {/* Party and owned pieces share the public fog's stacking level and follow it in
          paint order. Other pieces remain below it; the map stays covered. */}
      <TokenLayer
        tokens={backgroundOnly ? [] : tokens}
        drag={drag}
        groupDrag={selection.groupDrag}
        resize={tokenGestures.resize}
        rotate={tokenGestures.rotate}
        view={view}
        viewportSize={viewportSize}
        grid={scene.grid}
        activeLayer={activeLayer}
        playArea={scene.playArea}
        showPlayArea={showPlayArea}
        cameraLocked={cameraLocked}
        paintMode={paintMode}
        canMove={canMove}
        selectedMapObjectId={selection.selectedMapObjectId}
        selectedTokenIds={selectedTokenIds}
        canSetDeathSaves={canSetDeathSaves}
        conditionEntries={conditionEntries}
        fog={fog}
        hideCovered={fogOnTop}
        canSeeThroughFog={canSeeThroughFog}
        presentedInspection={presentedInspection}
        onInspectionChange={onTokenInspection}
        onBeginDrag={tokenGestures.beginTokenDrag}
        onBeginResize={tokenGestures.beginTokenResize}
        onBeginRotate={tokenGestures.beginTokenRotate}
        onDeathSaveChange={onDeathSaveChange}
        onContextMenu={onContextMenu}
      />

      {/* Weather stays visible over unexplored fog, while the map and secret
          pieces remain covered. At the same z-index, mount it after public fog
          and before rulers/lasers so those tools stay in front. */}
      <AtmosphereOverlay atmosphere={atmosphere} />

      {placementDrag && placementHover && !backgroundOnly ? (
        <PlacementPreview
          placementDrag={placementDrag}
          placementHover={placementHover}
          grid={scene.grid}
          view={view}
          fogOnTop={fogOnTop}
          conditionEntries={conditionEntries}
        />
      ) : null}

      {selectionBox ? (
        <Box
          aria-hidden
          data-selection-marquee
          sx={{
            ...selectionMarqueeSx,
            left: selectionBox.left,
            top: selectionBox.top,
            width: selectionBox.width,
            height: selectionBox.height,
          }}
        />
      ) : null}

      {paintMode === 'marquee' && selectedTokenIds.length ? (
        <SelectionToolbar
          count={selectedTokenIds.length}
          canDelete={Boolean(onDeleteTokens)}
          onDelete={selection.deleteSelection}
          onClear={selection.clearSelection}
        />
      ) : null}

      <DeletePiecesDialog
        {...selection.deleteDialog}
        container={() => hostRef.current}
      />

      <ViewportChrome
        hostRef={hostRef}
        rolls={rolls}
        controls={controls}
        fullscreenActive={fullscreenActive}
        fullscreenSheet={fullscreenSheet}
        floatingSheetOpen={floatingSheetOpen}
        setFloatingSheetOpen={setFloatingSheetOpen}
        imageSwitch={imageSwitch}
        initiative={initiative}
        layerSwitch={layerSwitch}
        backgroundStrip={backgroundStrip}
        showFullscreenControl={showFullscreenControl}
        toggleFullscreen={toggleFullscreen}
      />

      <ViewportCallouts
        hostRef={hostRef}
        grid={scene.grid}
        view={view}
        backgroundOnly={backgroundOnly}
        fogOnTop={fogOnTop}
        diceThrows={diceThrows}
        partyHex={partyHex}
        hexBubble={hexBubble}
        onHexBubbleClose={onHexBubbleClose}
        rollBubbles={rollBubbles}
        onRollBubbleDismiss={onRollBubbleDismiss}
      />

      {/* Conversation, not annotation: the stroke still under the pointer, the
          ruler and everyone's laser, drawn above the fog and above the pieces so
          pointing at something in the dark still means something. */}
      <DrawingCanvas
        onTop
        live={drawingTools.live}
        measure={ruler.measure || remoteMeasure || measured?.trail}
        grid={scene.grid}
        view={view}
      />
      <LaserOverlay
        lasers={lasers}
        localPointRef={laser.laserPointRef}
        localActive={paintMode === 'laser'}
        grid={scene.grid}
        view={view}
      />

      {hover && brushRadius > 0 ? (
        <BrushPreview mode={paintMode} point={hover} radius={brushRadius} />
      ) : null}

      {/* Marked as a control: without it the host captures the pointer on the
          way down and the close button never receives the click. */}
      <Box data-viewport-control>{toast}</Box>

      {measured ? <DistanceBadge measured={measured} fogOnTop={fogOnTop} /> : null}
    </Box>
  );
}
