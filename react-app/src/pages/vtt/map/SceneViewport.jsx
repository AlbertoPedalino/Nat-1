import {
  useCallback, useMemo, useRef, useState,
} from 'react';
import { Box } from '@mui/material';
import {
  cellSize,
  panBy,
  screenToWorld,
  tokenWorldRect,
  worldToScreen,
} from '../../../shared/vtt/map/geometry.js';
import {
  gridLineColor,
  isTokenInPlay,
  normalizeGridLineWidth,
  samePlayArea,
} from '../../../shared/vtt/scene/scene.js';
import { isMapPiece } from '../../../shared/vtt/map/mapObjects.js';
import {
  hexHeight, hexPlayAreaForImage, hexToWorld, isHexGrid, worldToHex,
} from '../../../shared/vtt/map/hexGeometry.js';
import HexBubble from '../hexcrawl/HexBubble.jsx';
import DrawingCanvas from './DrawingCanvas.jsx';
import AreaEffectsCanvas from './AreaEffectsCanvas.jsx';
import FogCanvas from './FogCanvas.jsx';
import RollBubble from '../rolls/RollBubble.jsx';
import DiceTray from '../rolls/DiceTray.jsx';
import FloatingSheetPanel from '../sheets/FloatingSheetPanel.jsx';
import LaserOverlay from './LaserOverlay.jsx';
import TokenLayer from '../tokens/TokenLayer.jsx';
import AtmosphereOverlay from '../atmosphere/AtmosphereOverlay.jsx';
import { imageFilterLook } from '../../../shared/vtt/scene/imageFilters.js';
import DeletePiecesDialog from '../tokens/DeletePiecesDialog.jsx';
import {
  brushRadiusFor,
  cursorFor,
  measurementBadge,
  playAreaBox,
  hexPlayAreaPolygon,
  imageBox,
  pointInBox,
} from './viewportGeometry.js';
import {
  coveringSx,
  hostSx,
  fillViewportSx,
  placementTargetSx,
  placementTargetHintSx,
  selectionMarqueeSx,
  imageSwitchSx,
  layerSwitchSx,
  backgroundStripSx,
} from './sceneViewportStyles.js';
import MapBackdrop from './MapBackdrop.jsx';
import { useViewportCamera } from './useViewportCamera.js';
import { usePinchZoom } from './usePinchZoom.js';
import { LONG_PRESS_SLOP, useLongPress } from './useLongPress.js';
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
  BrushPreview, DistanceBadge, PartyHexMarker, PlacementPreview,
} from './ViewportOverlays.jsx';
import { CornerButtons, FullscreenButton, SelectionToolbar } from './ViewportControls.jsx';

// The tools that paint an area rather than acting on one point.
const BRUSH_MODES = ['reveal', 'hide', 'draw', 'erase'];

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
  // Where the cursor is, so a brush can show what it is about to cover. Tracked
  // only while a brush is in hand: a state update per mouse move is not worth
  // paying for while merely moving pieces around.
  const [hover, setHover] = useState(null);
  // The controls live inside the viewport rather than around it, which is the
  // only way they survive fullscreen — a fullscreen element hides its siblings.
  const [controlsOpen, setControlsOpen] = useState(false);
  // Scenery follows the scene's own switch; a creature keeps its square whatever
  // that switch says, which is the whole reason the setting is not global.
  const snapObjects = scene.grid?.snapObjects !== false;
  const snapFor = (token) => (isMapPiece(token) ? snap && snapObjects : snap);

  // Read by abandonGesture, which runs from timers and touch handlers created
  // before the latest render.
  const onDragTokenRef = useRef(onDragToken);
  onDragTokenRef.current = onDragToken;
  const onPaintEndRef = useRef(onPaintEnd);
  onPaintEndRef.current = onPaintEnd;

  // A gesture taken over by another one (a long press opening a menu, a second
  // finger starting a pinch) ends here instead of just being dropped: a piece
  // this screen was already showing in motion is let go of on the other screens
  // (otherwise its keepalive frame keeps pinning it where the finger was), and
  // fog already painted is stored as when the brush lifts.
  const abandonGesture = useCallback(() => {
    const state = dragRef.current;
    dragRef.current = null;
    if (state?.kind === 'token' && state.lastBroadcast) {
      onDragTokenRef.current?.(state.token, { x: state.token.x, y: state.token.y, released: true });
    }
    if (state?.kind === 'paint') onPaintEndRef.current?.();
  }, []);
  // What became a menu was never a drag.
  const abandonForMenu = useCallback(() => {
    abandonGesture();
    setDrag(null);
    setMarkDrag(null);
  }, [abandonGesture]);
  const { armLongPress, cancelLongPress, cancelLongPressIfMoved } = useLongPress(abandonForMenu);

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

  // Two fingers are a pinch, whatever they landed on: whatever was being drawn,
  // painted or dragged is abandoned rather than continued with one of them.
  const abandonForPinch = () => {
    cancelLongPress();
    abandonGesture();
    setDrag(null);
    selection.cancelGesture();
    tokenGestures.cancel();
    setMarkDrag(null);
    ruler.cancel();
    drawingTools.cancel();
  };

  const beginPan = (event) => {
    if (cameraLocked) return;
    // One finger of a pinch must not also pan the map.
    if (pointersRef.current.size > 1) return;
    if (event.button !== 0 && event.button !== 1) return;
    // Controls sitting on top of the map are not the map. Without this the host
    // captures the pointer on the way down and the click never reaches the
    // button — which is exactly why fullscreen appeared to do nothing.
    //
    // `.MuiModal-root` for the same reason: in fullscreen every dialog has to
    // be mounted inside the map — a dialog on the document body is not painted
    // at all — so its buttons are inside this host and would lose their clicks
    // to the same capture. That is what made the custom roller do nothing.
    if (event.target.closest?.('[data-viewport-control], .MuiModal-root')) return;
    // Holding a map tool is an application gesture, not a browser drag. Without
    // cancelling the native pointer action, dragging beyond the viewport starts
    // selecting the surrounding page text and the next stroke can inherit that
    // selection instead of reaching the tool cleanly.
    event.preventDefault();
    // preventDefault also suppresses the browser's focus transfer. Leaving a
    // tool input focused makes Delete edit that input instead of the selection.
    hostRef.current?.focus({ preventScroll: true });
    globalThis.getSelection?.()?.removeAllRanges?.();
    if (event.button === 0) setSelectedMapObjectId(null);
    const point = screenPoint(event);
    event.currentTarget.setPointerCapture?.(event.pointerId);

    // With a tool selected, the left button uses it and panning moves to the
    // middle button: swapping tools every time you need to scroll the map is
    // the fastest way to make the feature annoying.
    let tappedMark;
    if (event.button === 0) {
      if (fogBrush.beginGesture(point)) return;
      if (drawingTools.beginGesture(point)) return;
      if (ruler.beginGesture(point)) return;
      if (paintMode === 'laser') {
        // The laser is already live because the tool is selected. A click merely
        // updates its position; it must not turn into a held gesture that clears
        // the dot again on pointer-up.
        laser.pointAt(cellPoint(point));
        return;
      }
      if (paintMode === 'marquee') {
        selection.beginMarquee(event, point);
        return;
      }
      if (paintMode === 'select') {
        const press = marks.press(event, point);
        if (press.held) return;
        tappedMark = press.tapped;
      }
    }

    // On a hex map the empty board is not empty: every hex is a thing the GM can
    // pick. Recorded as the start of a pan and settled on release, so dragging
    // the map still pans instead of selecting whatever it started over.
    const playBox = scene.playArea && !isHexGrid(scene.grid) ? playAreaBox(scene, view) : null;
    const pickedHex = isHexGrid(scene.grid)
      ? worldToHex(screenToWorld(point, view), scene.grid)
      : null;
    const hexMapBox = isHexGrid(scene.grid) && imageSize ? imageBox(imageSize, view) : null;
    // A background is a picture over the map, not the map: its pixels are no
    // hex, so a click on it must not walk the party anywhere.
    const canPickHex = event.button === 0
      && !backgroundOnly
      && !tappedMark
      && onHexClick
      && isHexGrid(scene.grid)
      && paintMode === 'select'
      && (!scene.playArea || isTokenInPlay({ x: pickedHex.q, y: pickedHex.r }, scene.playArea))
      && (!hexMapBox || pointInBox(point, hexMapBox))
      && (!playBox || pointInBox(point, playBox));
    dragRef.current = {
      kind: 'pan',
      last: point,
      from: point,
      hex: canPickHex
        ? worldToHex(screenToWorld(point, view), scene.grid)
        : null,
      // undefined: this press selects nothing (another tool, or no marks).
      mark: tappedMark,
    };
  };

  const handlePointerMove = (event) => {
    cancelLongPressIfMoved(event);

    const state = dragRef.current;
    const point = screenPoint(event);
    if (BRUSH_MODES.includes(paintMode)) setHover(point);

    // The laser follows the cursor as soon as the tool is in hand. Requiring the
    // button to be held made it look broken to everyone else: you point at
    // something, nobody sees a dot, and there is nothing on screen to say why.
    if (paintMode === 'laser' && !state) {
      laser.follow(cellPoint(point));
      return;
    }

    if (!state) return;

    if (state.kind === 'pan') {
      const dx = point.x - state.last.x;
      const dy = point.y - state.last.y;
      state.last = point;
      setView((current) => constrainView(panBy(current, dx, dy)));
      return;
    }

    if (selection.moveGesture(state, point)) return;
    if (marks.moveGesture(state, point)) return;
    if (fogBrush.moveGesture(state, point)) return;
    if (drawingTools.moveGesture(state, point)) return;
    if (ruler.moveGesture(state, point)) return;
    tokenGestures.moveGesture(state, point);
  };

  const handlePointerUp = (event) => {
    cancelLongPress();
    const state = dragRef.current;
    dragRef.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    if (!state) return;

    if (state.kind === 'pan') {
      if (!state.hex && state.mark === undefined) return;
      // A pan that went nowhere was a click on a hex or a mark. Same slop as a
      // long press: a hand on a trackpad never releases on the exact pixel it
      // pressed.
      const at = screenPoint(event);
      const moved = Math.hypot(at.x - state.from.x, at.y - state.from.y);
      if (event.type === 'pointercancel' || moved > LONG_PRESS_SLOP) return;
      if (state.mark !== undefined) onSelectDrawing?.(state.mark?.id ?? null);
      if (state.hex) onHexClick(state.hex);
      return;
    }

    if (selection.endGesture(state, event)) return;
    if (marks.endGesture(state)) return;
    if (fogBrush.endGesture(state)) return;
    if (drawingTools.endGesture(state)) return;
    if (ruler.endGesture(state)) return;
    tokenGestures.endGesture(state, event);
  };

  const handlePointerLeave = () => {
    setHover(null);
    if (paintMode === 'laser') laser.leave();
  };

  const size = cellSize(scene.grid) * view.zoom;
  const gridVisible = !backgroundOnly && scene.grid.visible && size > 4;
  const picksHex = Boolean(onHexClick) && !backgroundOnly && isHexGrid(scene.grid);
  const gridColor = gridLineColor(scene.grid);
  const gridLine = normalizeGridLineWidth(scene.grid.lineWidth);
  const measured = measurementBadge(tokens, drag, scene.grid, view, feetPerCell);
  const brushRadius = brushRadiusFor(paintMode, { brushSize, drawWidth, cell: size, fogScale: Math.max(1, fog?.scale || 1) });
  const hexMapBox = isHexGrid(scene.grid) && imageSize ? imageBox(imageSize, view) : null;
  const hexPlayAreaMatchesMap = Boolean(
    hexMapBox
    && scene.playArea
    && samePlayArea(scene.playArea, hexPlayAreaForImage(imageSize, scene.grid)),
  );
  const hexPlayAreaClip = scene.playArea && !hexPlayAreaMatchesMap
    ? hexPlayAreaPolygon(scene, view)
    : null;
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

      {rolls || controls || (fullscreenActive && fullscreenSheet) ? (
        <CornerButtons
          rolls={rolls}
          showSheetButton={Boolean(fullscreenActive && fullscreenSheet)}
          sheetOpen={floatingSheetOpen}
          onSheetOpenChange={setFloatingSheetOpen}
          hasControls={Boolean(controls)}
          controlsOpen={controlsOpen}
          onToggleControls={() => setControlsOpen((open) => !open)}
        />
      ) : null}

      {/* Rendered as-is: the rail positions itself against the map. Wrapping
          it in a second absolutely positioned box left it anchored to that
          box instead, which is why the tools were nowhere to be seen. */}
      {controls && controlsOpen ? controls : null}

      {fullscreenActive && fullscreenSheet && floatingSheetOpen ? (
        <FloatingSheetPanel
          choices={fullscreenSheet.choices}
          selectedId={fullscreenSheet.selectedId}
          onSelectionChange={fullscreenSheet.onSelectionChange}
          onClose={() => setFloatingSheetOpen(false)}
          containerRef={hostRef}
        >
          {fullscreenSheet.content}
        </FloatingSheetPanel>
      ) : null}

      {imageSwitch ? (
        <Box data-viewport-control sx={imageSwitchSx}>{imageSwitch}</Box>
      ) : null}

      {initiative}

      {layerSwitch ? (
        <Box data-viewport-control sx={layerSwitchSx}>{layerSwitch}</Box>
      ) : null}

      {backgroundStrip ? (
        <Box data-viewport-control sx={backgroundStripSx}>{backgroundStrip}</Box>
      ) : null}

      {showFullscreenControl ? (
        <FullscreenButton active={fullscreenActive} onToggle={toggleFullscreen} />
      ) : null}

      {/* Over the piece that rolled: the position is recomputed here rather than
          stored, so a bubble follows its creature while the map is panned. */}
      {/* Screen space, over everything: the dice are on the table, not on the
          map. A throw with no piece to land next to lands in the middle. */}
      <DiceTray
        centered={backgroundOnly}
        throws={(diceThrows || []).map(({ roll, token }) => {
          const rect = !backgroundOnly && token ? tokenWorldRect(token, scene.grid) : null;
          const at = rect ? worldToScreen(rect, view) : null;
          return {
            roll,
            dice: roll.rolls || [],
            x: at ? at.x + (rect.width * view.zoom) / 2 : (hostRef.current?.clientWidth || 0) / 2,
            // Below the piece, where the bubble is not.
            y: at ? at.y + rect.height * view.zoom + 18 : (hostRef.current?.clientHeight || 0) / 2,
          };
        })}
      />

      {!backgroundOnly && partyHex && isHexGrid(scene.grid) ? (
        <PartyHexMarker partyHex={partyHex} grid={scene.grid} view={view} fogOnTop={fogOnTop} />
      ) : null}

      {hexBubble && !backgroundOnly ? (() => {
        const centre = worldToScreen(hexToWorld(hexBubble.hex, scene.grid), view);
        return (
          <HexBubble
            bubble={hexBubble}
            x={centre.x}
            // Clear of the hex itself: half its height, plus the tail.
            y={centre.y - (hexHeight(scene.grid) * view.zoom) / 2 - 4}
            onClose={onHexBubbleClose}
          />
        );
      })() : null}

      {!backgroundOnly && (rollBubbles || []).map(({ roll, token }) => {
        const rect = tokenWorldRect(token, scene.grid);
        const at = worldToScreen(rect, view);
        return (
          <RollBubble
            key={roll.id}
            roll={roll}
            x={at.x + (rect.width * view.zoom) / 2}
            y={at.y - 6}
            underFog={fogOnTop}
            onDismiss={onRollBubbleDismiss}
          />
        );
      })}

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
