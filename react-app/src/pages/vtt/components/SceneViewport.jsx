import {
  useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState,
} from 'react';
import { Box, Button, IconButton, Tooltip, Typography } from '@mui/material';
import { MapPin, Maximize2, Minimize2, ScrollText, Settings2, X } from 'lucide-react';
import { brushCells } from '../../../shared/vtt/fog.js';
import {
  DEFAULT_VIEW,
  cellSize,
  cellToWorld,
  constrainCoverView,
  dropPosition,
  fillView,
  fitView,
  panBy,
  screenToWorld,
  tokenWorldRect,
  worldToCell,
  worldToScreen,
  zoomAt,
} from '../../../shared/vtt/geometry.js';
import { measureLabel, movementLabel } from '../../../shared/vtt/measure.js';
import { movedPoints } from '../../../shared/vtt/drawing.js';
import { VTT_COLORS, vttAlpha } from '../../../shared/vtt/colors.js';
import { gridLineColor, isTokenInPlay, normalizeGridLineWidth } from '../../../shared/vtt/scene.js';
import { isMapPiece } from '../../../shared/vtt/mapObjects.js';
import {
  axialRound, hexHeight, hexPlayAreaForImage, hexToWorld, hexWidth, isHexGrid,
  worldToAxial, worldToHex,
} from '../../../shared/vtt/hexGeometry.js';
import HexGrid from './HexGrid.jsx';
import SquareGrid from './SquareGrid.jsx';
import HexBubble from './HexBubble.jsx';
import {
  cameraPoseToView, viewToCameraPose,
} from '../../../shared/vtt/cameraSync.js';
import DrawingCanvas from './DrawingCanvas.jsx';
import FogCanvas from './FogCanvas.jsx';
import RollBubble from './RollBubble.jsx';
import DiceTray from './DiceTray.jsx';
import FloatingSheetPanel from './FloatingSheetPanel.jsx';
import LaserOverlay from './LaserOverlay.jsx';
import TokenSprite from './TokenSprite.jsx';
import TokenLayer from './TokenLayer.jsx';
import AtmosphereOverlay from './AtmosphereOverlay.jsx';

const WHEEL_STEP = 1.12;
const VIEWPORT_CONTROL_SELECTOR = '[data-viewport-control], .MuiModal-root, .MuiPopover-root, .MuiPopper-root';
// A press has to be still to be a press, and long enough not to be a tap. Both
// numbers are what a phone's own long-press feels like.
const LONG_PRESS_MS = 480;
const LONG_PRESS_SLOP = 12;
const DRAG_BROADCAST_MS = 40;
// Spans are kept to a tenth of a square: fine enough for a door that is half a
// cell deep, coarse enough that the number stays readable in the menu.
const roundSpan = (span) => Math.max(0.5, Math.round(span * 10) / 10);
const LASER_BROADCAST_MS = 50;

// Inline SVG cursors so the pointer says which tool is in hand. Hotspot at the
// nib for the pencil and at the corner of the block for the eraser, or the mark
// lands where the cursor is not.
const PENCIL_CURSOR = "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23e8c96a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M12 20h9'/><path d='M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z'/></svg>\") 2 22, crosshair";
const ERASER_CURSOR = "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23de675f' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='m7 21-4.3-4.3a1 1 0 0 1 0-1.4L15 3a2 2 0 0 1 3 0l3 3a2 2 0 0 1 0 3L10.5 19.5'/><path d='M22 21H7'/></svg>\") 3 21, crosshair";

// The tools that paint an area rather than acting on one point.
const BRUSH_MODES = ['reveal', 'hide', 'draw', 'erase'];

// The map's mile scale, or nothing at all when it is being read in feet. The
// scene keeps both numbers so switching back and forth loses neither, and this
// is the one place that decides which of them the ruler is speaking.
function overlandMiles(grid) {
  return grid?.measureUnit === 'miles' ? grid.milesPerCell : 0;
}

// On-screen radius of what the tool will affect, in the same units the tool
// itself uses: fog brushes are measured in squares, ink in tenths of one, and
// the eraser reaches half a square around the pointer.
function brushRadiusFor(paintMode, { brushSize, drawWidth, cell }) {
  if (paintMode === 'reveal' || paintMode === 'hide') return (Math.max(1, brushSize) * cell) / 2;
  if (paintMode === 'draw') return Math.max(2, ((drawWidth || 3) / 10) * cell) / 2;
  if (paintMode === 'erase') return (0.5 + (drawWidth || 3) / 20) * cell;
  return 0;
}

function cursorFor(paintMode) {
  if (paintMode === 'draw') return PENCIL_CURSOR;
  if (paintMode === 'erase') return ERASER_CURSOR;
  if (paintMode === 'reveal' || paintMode === 'hide') return 'crosshair';
  if (paintMode === 'text') return 'text';
  if (paintMode === 'laser' || paintMode === 'measure') return 'crosshair';
  return 'grab';
}

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
  fogOpacity = 1,
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
  onHexBubbleOpen,
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
  onLaser,
  lasers,
  rollBubbles,
  diceThrows,
  onDiceSettled,
  conditionEntries,
  presentedInspection,
  onTokenInspection,
  measureShape,
  feetPerCellForRuler,
  onMeasure,
  remoteMeasure,
  controls,
  layerSwitch,
  imageSwitch,
  toast,
  fullscreenSheet,
  onFullscreenChange,
  followView,
  onViewChange,
  cameraLocked = false,
  fillViewport = false,
  showFullscreenControl = true,
}) {
  const hostRef = useRef(null);
  const dragRef = useRef(null);
  const lastLaserRef = useRef(0);
  const laserPointRef = useRef(null);
  const laserSelectedRef = useRef(false);
  // Every finger currently on the map, recorded in the capture phase so a
  // pinch works even when one of them landed on a piece — a token stops the
  // event from reaching the host, and the second finger would go unseen.
  const pointersRef = useRef(new Map());
  const pinchRef = useRef(null);
  const longPressRef = useRef(null);
  const [view, setView] = useState(DEFAULT_VIEW);
  const [drag, setDrag] = useState(null);
  const [resize, setResize] = useState(null);
  const [rotate, setRotate] = useState(null);
  const [selectedMapObjectId, setSelectedMapObjectId] = useState(null);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  // The stroke in progress lives in a ref, not in state. Accumulating it in
  // state meant the commit ran inside a state updater — a side effect in a
  // function React may call more than once or defer, which is why the second
  // stroke onwards came out as a single dot.
  const strokeRef = useRef([]);
  const [strokeTick, setStrokeTick] = useState(0);
  const [loadedImageSize, setLoadedImageSize] = useState(null);
  // SceneEditor decodes each replacement before exposing it and supplies its
  // dimensions in the same render as the URL. This prevents one paint with the
  // previous picture's fit while the new <img> waits to emit `load`.
  const imageSize = preparedImageSize || loadedImageSize;
  const [fullscreen, setFullscreen] = useState(false);
  // The stand-in for fullscreen where the browser will not give us the real
  // thing.
  const [covering, setCovering] = useState(false);
  // The controls live inside the viewport rather than around it, which is the
  // only way they survive fullscreen — a fullscreen element hides its siblings.
  const [controlsOpen, setControlsOpen] = useState(false);
  const [floatingSheetOpen, setFloatingSheetOpen] = useState(false);
  const [measure, setMeasure] = useState(null);
  // Where the cursor is, so a brush can show what it is about to cover. Tracked
  // only while a brush is in hand: a state update per mouse move is not worth
  // paying for while merely moving pieces around.
  const [hover, setHover] = useState(null);
  const [placementHover, setPlacementHover] = useState(null);
  // Scenery follows the scene's own switch; a creature keeps its square whatever
  // that switch says, which is the whole reason the setting is not global.
  const snapObjects = scene.grid?.snapObjects !== false;
  const snapFor = (token) => (isMapPiece(token) ? snap && snapObjects : snap);
  // The mark being dragged, as an offset in cells: applied at render so the
  // stroke follows the pointer without a write per frame.
  const [markDrag, setMarkDrag] = useState(null);

  const backgroundFrame = useMemo(() => (
    backgroundOnly && imageSize && viewportSize.width > 0 && viewportSize.height > 0
      ? {
        imageWidth: imageSize.width,
        imageHeight: imageSize.height,
        viewportWidth: viewportSize.width,
        viewportHeight: viewportSize.height,
      }
      : null
  ), [backgroundOnly, imageSize, viewportSize]);
  const backgroundCover = useMemo(
    () => (backgroundFrame ? fillView(backgroundFrame) : null),
    [backgroundFrame],
  );

  const constrainView = useCallback((next) => {
    if (!backgroundFrame) return next;
    return constrainCoverView(next, backgroundFrame);
  }, [backgroundFrame]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;
    const measure = () => {
      const box = host.getBoundingClientRect();
      setViewportSize((current) => (
        current.width === box.width && current.height === box.height
          ? current
          : { width: box.width, height: box.height }
      ));
    };
    measure();
    if (typeof ResizeObserver !== 'function') return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const pose = viewToCameraPose(view, viewportSize, { zoomBase: backgroundCover?.zoom });
    if (pose) onViewChange?.(pose);
  }, [backgroundCover, onViewChange, view, viewportSize]);

  // Projectors follow rather than jump. Each realtime target starts a short
  // interpolation from the frame already on screen; a newer target cancels it
  // and continues from that exact point, which stays smooth during a long pan.
  useEffect(() => {
    const converted = cameraPoseToView(followView, viewportSize, {
      zoomBase: backgroundCover?.zoom,
    });
    const target = converted ? constrainView(converted) : null;
    if (!target) return undefined;
    let frame = 0;
    let settled = false;
    const step = () => {
      setView((current) => {
        const next = constrainView({
          x: current.x + (target.x - current.x) * 0.34,
          y: current.y + (target.y - current.y) * 0.34,
          zoom: current.zoom + (target.zoom - current.zoom) * 0.34,
        });
        settled = Math.abs(next.x - target.x) < 0.15
          && Math.abs(next.y - target.y) < 0.15
          && Math.abs(next.zoom - target.zoom) < 0.001;
        return settled ? target : next;
      });
      if (!settled) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [backgroundCover, constrainView, followView, viewportSize]);

  useEffect(() => {
    if (!placementDrag || backgroundOnly) setPlacementHover(null);
  }, [backgroundOnly, placementDrag]);

  // Resize and rotation furniture belongs only to the piece of scenery the user
  // has picked. Drop the selection if that piece is removed or stops being
  // scenery (for example after a realtime scene update).
  useEffect(() => {
    setSelectedMapObjectId((selectedId) => (
      selectedId && tokens.some((token) => token.id === selectedId && isMapPiece(token))
        ? selectedId
        : null
    ));
  }, [tokens]);

  // Reframe once per picture. A battlemap stays wholly visible with a little
  // breathing room; an establishing-shot background fills the screen and may
  // crop at the edges. Backgrounds also reframe when the viewport itself
  // changes shape (fullscreen and device rotation) so no letterboxing returns.
  const backgroundViewportWidth = backgroundOnly ? viewportSize.width : null;
  const backgroundViewportHeight = backgroundOnly ? viewportSize.height : null;
  useLayoutEffect(() => {
    if (!imageSize || !hostRef.current) return;
    const box = hostRef.current.getBoundingClientRect();
    const frameView = backgroundOnly ? fillView : fitView;
    setView(frameView({
      imageWidth: imageSize.width,
      imageHeight: imageSize.height,
      viewportWidth: box.width,
      viewportHeight: box.height,
    }));
  }, [
    backgroundOnly,
    backgroundViewportHeight,
    backgroundViewportWidth,
    imageSize,
    imageUrl,
  ]);

  // Real fullscreen where the browser has it: the map is the whole point of the
  // page, and the browser's own chrome is worth the pixels at the table.
  //
  // iOS has no Fullscreen API for anything but a video, which is why the button
  // did nothing on a phone — exactly where the screen is smallest and it matters
  // most. There the map covers the window instead, which is as close as a page
  // is allowed to get.
  const toggleFullscreen = useCallback(() => {
    const host = hostRef.current;
    if (!host) return;
    const request = host.requestFullscreen || host.webkitRequestFullscreen;
    const exit = document.exitFullscreen || document.webkitExitFullscreen;
    if (!request) {
      setCovering((current) => !current);
      return;
    }
    try {
      if (document.fullscreenElement || document.webkitFullscreenElement) exit.call(document);
      else request.call(host);
    } catch (_) {
      setCovering((current) => !current);
    }
  }, []);

  const fullscreenActive = fullscreen || covering;

  useEffect(() => {
    onFullscreenChange?.(fullscreenActive);
    if (!fullscreenActive) setFloatingSheetOpen(false);
  }, [fullscreenActive, onFullscreenChange]);

  // Escape and the browser's own control leave fullscreen without telling us,
  // so the icon follows the document rather than our last click.
  useEffect(() => {
    const sync = () => setFullscreen(
      document.fullscreenElement === hostRef.current
      || document.webkitFullscreenElement === hostRef.current,
    );
    document.addEventListener('fullscreenchange', sync);
    document.addEventListener('webkitfullscreenchange', sync);
    return () => {
      document.removeEventListener('fullscreenchange', sync);
      document.removeEventListener('webkitfullscreenchange', sync);
    };
  }, []);

  const screenPoint = useCallback((event) => {
    const box = hostRef.current?.getBoundingClientRect();
    return { x: event.clientX - (box?.left || 0), y: event.clientY - (box?.top || 0) };
  }, []);

  const handleWheel = useCallback((event) => {
    if (cameraLocked) return;
    // Fullscreen dialogs and the floating sheet live inside the fullscreen map
    // element (portals outside it are not painted by the browser). They are
    // still UI surfaces, not map canvas: let their own scroll container receive
    // the wheel instead of swallowing it here as map zoom.
    if (event.target.closest?.(VIEWPORT_CONTROL_SELECTOR)) return;
    event.preventDefault();
    const factor = event.deltaY < 0 ? WHEEL_STEP : 1 / WHEEL_STEP;
    setView((current) => constrainView(zoomAt(current, factor, screenPoint(event))));
  }, [cameraLocked, constrainView, screenPoint]);

  // Wheel has to be a non-passive native listener: React's onWheel is passive,
  // and preventDefault there is ignored, so the page scrolls while zooming.
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;
    host.addEventListener('wheel', handleWheel, { passive: false });
    return () => host.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  // A stationary pointer is still pointing. Refresh the broadcast while the
  // laser remains selected so its safety TTL only removes abandoned dots, not
  // a dot deliberately held over one square. Switching tools clears it at once.
  useEffect(() => {
    if (paintMode !== 'laser') {
      if (laserSelectedRef.current) onLaser?.(null);
      laserSelectedRef.current = false;
      laserPointRef.current = null;
      return undefined;
    }

    laserSelectedRef.current = true;
    const timer = setInterval(() => {
      if (laserPointRef.current) onLaser?.(laserPointRef.current);
    }, 1000);
    return () => clearInterval(timer);
  }, [onLaser, paintMode]);

  // The brush works in fog cells, which are finer than grid squares: that is
  // what makes half a doorway possible, and what makes a round brush look round.
  const paintAt = useCallback((point) => {
    const scale = Math.max(1, fog?.scale || 1);
    const world = screenToWorld(point, view);
    const unit = cellSize(scene.grid) / scale;
    const col = Math.floor((world.x - (scene.grid.offsetX || 0)) / unit);
    const row = Math.floor((world.y - (scene.grid.offsetY || 0)) / unit);
    // The brush is set in squares, so it grows with the resolution rather than
    // shrinking to a pinprick when the fog gets finer.
    onPaint?.(brushCells(col, row, Math.max(1, Math.round(brushSize * scale))), paintMode === 'reveal');
  }, [brushSize, fog?.scale, onPaint, paintMode, scene.grid, view]);

  // Strokes are stored in cells, fractionally: recalibrating the grid must not
  // slide a drawing off the wall it was traced on.
  const cellPoint = useCallback((point) => {
    const world = screenToWorld(point, view);
    const size = cellSize(scene.grid);
    return {
      x: (world.x - (scene.grid.offsetX || 0)) / size,
      y: (world.y - (scene.grid.offsetY || 0)) / size,
    };
  }, [scene.grid, view]);

  // Where a dragged-in piece would land, centred under the pointer. Only an
  // object may come to rest between squares: a creature, an imported fight and a
  // character are laid out in whole cells by the code that receives them.
  const placementPosition = (event) => {
    const world = screenToWorld(screenPoint(event), view);
    const w = Math.max(1, Number(placementDrag?.token?.w) || 1);
    const h = Math.max(1, Number(placementDrag?.token?.h) || 1);
    const free = placementDrag?.kind === 'object' && !snapObjects;

    // A hex piece stands on a hex, so the pointer is already its centre: none of
    // the half-span shifting a square grid needs to centre a 2x2.
    if (isHexGrid(scene.grid)) {
      const axial = worldToAxial(world, scene.grid);
      const cell = free ? axial : axialRound(axial);
      return { x: cell.q, y: cell.r };
    }

    if (free) {
      const at = cellPoint(screenPoint(event));
      return { x: at.x - w / 2, y: at.y - h / 2 };
    }
    const cell = worldToCell(world, scene.grid);
    return { x: cell.col - Math.floor(w / 2), y: cell.row - Math.floor(h / 2) };
  };

  const cancelLongPress = useCallback(() => {
    if (!longPressRef.current) return;
    clearTimeout(longPressRef.current.timer);
    longPressRef.current = null;
  }, []);

  // A finger has no right button, so holding still on a piece is how the menu
  // is asked for. Armed before the "can this be moved" check: marking somebody
  // else's monster is exactly what a player needs the menu for.
  const armLongPress = useCallback((event, token) => {
    if (event.pointerType === 'mouse' || !onContextMenu) return;
    const at = { x: event.clientX, y: event.clientY };
    cancelLongPress();
    longPressRef.current = {
      from: at,
      timer: setTimeout(() => {
        longPressRef.current = null;
        // What became a menu was never a drag.
        dragRef.current = null;
        setDrag(null);
        onContextMenu(token, at);
      }, LONG_PRESS_MS),
    };
  }, [cancelLongPress, onContextMenu]);

  useEffect(() => cancelLongPress, [cancelLongPress]);

  // Two fingers are a pinch, whatever they landed on: whatever was being drawn,
  // painted or dragged is abandoned rather than continued with one of them.
  const trackPointer = (event) => {
    if (cameraLocked) return;
    if (event.target.closest?.('[data-viewport-control], .MuiModal-root')) return;
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointersRef.current.size !== 2) return;

    cancelLongPress();
    dragRef.current = null;
    setDrag(null);
    setResize(null);
    setRotate(null);
    strokeRef.current = [];
    setStrokeTick((tick) => tick + 1);
    pinchRef.current = readPinch();
  };

  const readPinch = () => {
    const [a, b] = [...pointersRef.current.values()];
    if (!a || !b) return null;
    const box = hostRef.current?.getBoundingClientRect();
    return {
      distance: Math.max(1, Math.hypot(b.x - a.x, b.y - a.y)),
      centre: {
        x: (a.x + b.x) / 2 - (box?.left || 0),
        y: (a.y + b.y) / 2 - (box?.top || 0),
      },
    };
  };

  const trackPointerMove = (event) => {
    if (!pointersRef.current.has(event.pointerId)) return;
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    const previous = pinchRef.current;
    if (pointersRef.current.size !== 2 || !previous) return;
    const next = readPinch();
    if (!next) return;
    pinchRef.current = next;

    // Zoom about the point between the fingers, and follow that point as it
    // moves: on a phone, spreading and sliding are one gesture.
    setView((current) => constrainView(panBy(
      zoomAt(current, next.distance / previous.distance, next.centre),
      next.centre.x - previous.centre.x,
      next.centre.y - previous.centre.y,
    )));
  };

  const forgetPointer = (event) => {
    pointersRef.current.delete(event.pointerId);
    if (pointersRef.current.size < 2) pinchRef.current = null;
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
    globalThis.getSelection?.()?.removeAllRanges?.();
    if (event.button === 0) setSelectedMapObjectId(null);
    const point = screenPoint(event);
    event.currentTarget.setPointerCapture?.(event.pointerId);

    // With a brush selected, the left button paints and panning moves to the
    // middle button: swapping tools every time you need to scroll the map is
    // the fastest way to make the feature annoying.
    if (event.button === 0 && (paintMode === 'reveal' || paintMode === 'hide')) {
      dragRef.current = { kind: 'paint' };
      paintAt(point);
      return;
    }

    if (event.button === 0 && paintMode === 'draw') {
      dragRef.current = { kind: 'draw' };
      strokeRef.current = [cellPoint(point)];
      setStrokeTick((tick) => tick + 1);
      return;
    }

    if (event.button === 0 && paintMode === 'text') {
      dragRef.current = { kind: 'note' };
      onWriteNote?.(cellPoint(point));
      return;
    }

    // In hand rather than in a tool: a mark is picked up the way a piece is, by
    // taking hold of it. The board still pans from anywhere it is not covered.
    if (event.button === 0 && paintMode === 'select' && movableDrawing) {
      const at = cellPoint(point);
      const mark = movableDrawing(at);
      if (mark) {
        onSelectDrawing?.(mark.id);
        dragRef.current = { kind: 'mark', mark, from: at, offset: { x: 0, y: 0 } };
        setMarkDrag({ id: mark.id, x: 0, y: 0 });
        return;
      }
      onSelectDrawing?.(null);
    }

    if (event.button === 0 && paintMode === 'measure') {
      const at = cellPoint(point);
      dragRef.current = { kind: 'measure', from: at };
      setMeasure({ shape: measureShape, from: at, to: at, label: '' });
      return;
    }

    if (event.button === 0 && paintMode === 'laser') {
      // The laser is already live because the tool is selected. A click merely
      // updates its position; it must not turn into a held gesture that clears
      // the dot again on pointer-up.
      const at = cellPoint(point);
      laserPointRef.current = at;
      onLaser?.(at);
      return;
    }

    if (event.button === 0 && paintMode === 'erase') {
      dragRef.current = { kind: 'erase' };
      onErase?.(cellPoint(point));
      return;
    }
    // On a hex map the empty board is not empty: every hex is a thing the GM can
    // pick. Recorded as the start of a pan and settled on release, so dragging
    // the map still pans instead of selecting whatever it started over.
    const playBox = scene.playArea && !isHexGrid(scene.grid) ? playAreaBox(scene, view) : null;
    const pickedHex = isHexGrid(scene.grid)
      ? worldToHex(screenToWorld(point, view), scene.grid)
      : null;
    const hexMapBox = isHexGrid(scene.grid) && imageSize ? imageBox(imageSize, view) : null;
    const canPickHex = event.button === 0
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
    };
  };

  const beginTokenDrag = useCallback((event, token) => {
    event.stopPropagation();
    setSelectedMapObjectId(isMapPiece(token) ? token.id : null);
    armLongPress(event, token);
    if (!canMove(token)) return;
    const pointer = screenToWorld(screenPoint(event), view);
    const rect = tokenWorldRect(token, scene.grid);
    dragRef.current = {
      kind: 'token',
      token,
      grabOffset: { x: pointer.x - rect.x, y: pointer.y - rect.y },
    };
    setDrag({ id: token.id, x: token.x, y: token.y });
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }, [armLongPress, canMove, scene.grid, screenPoint, view]);

  const beginTokenResize = useCallback((event, token) => {
    event.stopPropagation();
    if (!canMove(token)) return;
    const width = Math.max(0.5, Number(token.w) || 1);
    const height = Math.max(0.5, Number(token.h) || 1);
    dragRef.current = {
      kind: 'resize',
      token,
      from: screenToWorld(screenPoint(event), view),
      width,
      height,
    };
    setResize({ id: token.id, w: token.w || 1, h: token.h || 1 });
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }, [canMove, screenPoint, view]);

  const beginTokenRotate = useCallback((event, token) => {
    event.stopPropagation();
    if (!canMove(token)) return;
    const rect = tokenWorldRect(token, scene.grid);
    const centre = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    const pointer = screenToWorld(screenPoint(event), view);
    dragRef.current = {
      kind: 'rotate',
      token,
      centre,
      fromAngle: Math.atan2(pointer.y - centre.y, pointer.x - centre.x),
      rotation: Number(token.rotation) || 0,
    };
    setRotate({ id: token.id, rotation: Number(token.rotation) || 0 });
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }, [canMove, scene.grid, screenPoint, view]);

  const handlePointerMove = (event) => {
    const held = longPressRef.current;
    if (held && Math.hypot(event.clientX - held.from.x, event.clientY - held.from.y) > LONG_PRESS_SLOP) {
      cancelLongPress();
    }

    const state = dragRef.current;
    const point = screenPoint(event);
    if (BRUSH_MODES.includes(paintMode)) setHover(point);

    // The laser follows the cursor as soon as the tool is in hand. Requiring the
    // button to be held made it look broken to everyone else: you point at
    // something, nobody sees a dot, and there is nothing on screen to say why.
    if (paintMode === 'laser' && !state) {
      const at = cellPoint(point);
      // Local rendering reads this ref on the next animation frame. Broadcasting
      // stays throttled, but no longer limits what the person pointing sees.
      laserPointRef.current = at;
      const now = Date.now();
      if (now - lastLaserRef.current >= LASER_BROADCAST_MS) {
        lastLaserRef.current = now;
        onLaser?.(at);
      }
      return;
    }

    if (!state) return;

    if (state.kind === 'mark') {
      const at = cellPoint(point);
      const offset = { x: at.x - state.from.x, y: at.y - state.from.y };
      state.offset = offset;
      setMarkDrag({ id: state.mark.id, ...offset });
      return;
    }

    if (state.kind === 'paint') {
      paintAt(point);
      return;
    }

    if (state.kind === 'draw') {
      strokeRef.current.push(cellPoint(point));
      setStrokeTick((tick) => tick + 1);
      return;
    }

    if (state.kind === 'erase') {
      onErase?.(cellPoint(point));
      return;
    }

    if (state.kind === 'note') return;

    if (state.kind === 'measure') {
      const at = cellPoint(point);
      const next = {
        shape: measureShape,
        from: state.from,
        to: at,
        // The ruler is told what it is measuring across: on hexes a step is a
        // step, and a scene with a mile scale answers in miles.
        label: measureLabel(measureShape, state.from, at, {
          feetPerCell: feetPerCellForRuler,
          milesPerCell: overlandMiles(scene.grid),
          shape: isHexGrid(scene.grid) ? 'hex' : 'square',
        }),
      };
      setMeasure(next);
      // Shown to the table as it is dragged, like the laser: measuring out loud
      // is half the point of measuring.
      onMeasure?.(next);
      return;
    }

    if (state.kind === 'pan') {
      const dx = point.x - state.last.x;
      const dy = point.y - state.last.y;
      state.last = point;
      setView((current) => constrainView(panBy(current, dx, dy)));
      return;
    }

    if (state.kind === 'resize') {
      const at = screenToWorld(point, view);
      const cell = cellSize(scene.grid);
      // Each side follows its own axis, always. Keeping the shape unless Shift
      // was held made the corner useless on a tablet, where there is no Shift to
      // hold: pulling it sideways only ever scaled the whole picture up, and a
      // rug could never be fitted to the room it lies in. Dragging one way only
      // is how a picture is now scaled on one axis; both ways scale both.
      const next = {
        w: roundSpan(state.width + (at.x - state.from.x) / cell),
        h: roundSpan(state.height + (at.y - state.from.y) / cell),
      };
      state.next = next;
      setResize({ id: state.token.id, ...next });
      return;
    }

    if (state.kind === 'rotate') {
      const at = screenToWorld(point, view);
      const angle = Math.atan2(at.y - state.centre.y, at.x - state.centre.x);
      const degrees = state.rotation + ((angle - state.fromAngle) * 180) / Math.PI;
      const next = Math.round(((degrees % 360) + 360) % 360);
      state.next = next;
      setRotate({ id: state.token.id, rotation: next });
      return;
    }

    // Follow the pointer unsnapped so the piece does not stutter between cells;
    // the snap happens once, on drop.
    const next = dropPosition({
      pointerWorld: screenToWorld(point, view),
      grabOffset: state.grabOffset,
      grid: scene.grid,
      snap: false,
      span: state.token,
    });
    setDrag({ id: state.token.id, x: next.x, y: next.y });

    // Tell the other viewers where the piece is right now. Throttled to one
    // frame's worth: this is a broadcast, not a write, but flooding the socket
    // buys nothing the eye can see.
    const now = Date.now();
    if (now - (state.lastBroadcast || 0) >= DRAG_BROADCAST_MS) {
      state.lastBroadcast = now;
      onDragToken?.(state.token, next);
    }
  };

  const handlePointerUp = (event) => {
    cancelLongPress();
    const state = dragRef.current;
    dragRef.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);

    if (state?.kind === 'mark') {
      setMarkDrag(null);
      // One write at the end, as with a piece: a stroke dragged across the board
      // would otherwise be a row update per frame.
      if (state.offset.x || state.offset.y) {
        onMoveDrawing?.(state.mark, state.offset);
      }
      return;
    }

    // One write at the end of the stroke, same discipline as a token drag.
    if (state?.kind === 'paint') {
      onPaintEnd?.();
      return;
    }

    if (state?.kind === 'draw') {
      const points = strokeRef.current;
      strokeRef.current = [];
      setStrokeTick((tick) => tick + 1);
      if (points.length) onDrawEnd?.(points);
      return;
    }

    if (state?.kind === 'pan' && state.hex) {
      // A pan that went nowhere was a click on a hex. Same slop as a long press:
      // a hand on a trackpad never releases on the exact pixel it pressed.
      const at = screenPoint(event);
      const moved = Math.hypot(at.x - state.from.x, at.y - state.from.y);
      if (moved <= LONG_PRESS_SLOP) onHexClick(state.hex);
      return;
    }

    if (state?.kind === 'erase' || state?.kind === 'note') return;

    // The ruler disappears on release; nothing is written down.
    if (state?.kind === 'measure') {
      setMeasure(null);
      onMeasure?.(null);
      return;
    }


    if (state?.kind === 'resize') {
      const next = state.next || { w: state.width, h: state.height };
      setResize(null);
      if (next.w !== state.token.w || next.h !== state.token.h) onResizeToken?.(state.token, next);
      return;
    }


    if (state?.kind === 'rotate') {
      const next = state.next ?? state.rotation;
      setRotate(null);
      if (next !== state.token.rotation) onRotateToken?.(state.token, { rotation: next });
      return;
    }

    if (!state || state.kind !== 'token') return;

    const landing = dropPosition({
      pointerWorld: screenToWorld(screenPoint(event), view),
      grabOffset: state.grabOffset,
      grid: scene.grid,
      snap: snapFor(state.token),
      span: state.token,
    });
    setDrag(null);
    // One write per gesture, and only when the piece actually changed square.
    // A drag that ends where it started still needs the final broadcast undone,
    // which the committed-position handler does for the other viewers.
    if (landing.x !== state.token.x || landing.y !== state.token.y) {
      onMoveToken?.(state.token, landing);
    } else {
      onDragToken?.(state.token, { x: state.token.x, y: state.token.y });
    }
  };

  // The mark under the pointer is drawn where it is being taken, not where it
  // still is in the database.
  const shownDrawings = markDrag
    ? (drawings || []).map((drawing) => (drawing.id === markDrag.id
      ? { ...drawing, points: movedPoints(drawing, markDrag.x, markDrag.y) }
      : drawing))
    : drawings;

  const size = cellSize(scene.grid) * view.zoom;
  const gridVisible = !backgroundOnly && scene.grid.visible && size > 4;
  const gridColor = gridLineColor(scene.grid);
  const gridLine = normalizeGridLineWidth(scene.grid.lineWidth);
  const measured = measurementBadge(tokens, drag, scene.grid, view, feetPerCell);
  const brushRadius = brushRadiusFor(paintMode, { brushSize, drawWidth, cell: size });
  const hexMapBox = isHexGrid(scene.grid) && imageSize ? imageBox(imageSize, view) : null;
  const hexPlayAreaMatchesMap = Boolean(
    hexMapBox
    && scene.playArea
    && samePlayArea(scene.playArea, hexPlayAreaForImage(imageSize, scene.grid)),
  );
  const hexPlayAreaClip = scene.playArea && !hexPlayAreaMatchesMap
    ? hexPlayAreaPolygon(scene, view)
    : null;

  return (
    <Box
      ref={hostRef}
      onPointerDownCapture={trackPointer}
      onPointerMoveCapture={trackPointerMove}
      onPointerUpCapture={forgetPointer}
      onPointerCancelCapture={forgetPointer}
      onPointerDown={beginPan}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerLeave={() => {
        setHover(null);
        if (paintMode === 'laser') {
          laserPointRef.current = null;
          onLaser?.(null);
        }
      }}
      onContextMenu={(event) => event.preventDefault()}
      onDragOver={(event) => {
        if (backgroundOnly) {
          event.dataTransfer.dropEffect = 'none';
          return;
        }
        if (!placementDrag && !onDropCharacter) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
        if (!placementDrag) return;
        const next = placementPosition(event);
        setPlacementHover((current) => (
          current?.x === next.x && current?.y === next.y ? current : next
        ));
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setPlacementHover(null);
      }}
      onDrop={(event) => {
        if (backgroundOnly) {
          event.preventDefault();
          setPlacementHover(null);
          return;
        }
        if (!onDropPlacement && !onDropCharacter) return;
        event.preventDefault();
        if (placementDrag && onDropPlacement) {
          const position = placementHover || placementPosition(event);
          setPlacementHover(null);
          onDropPlacement(placementDrag, position);
          return;
        }
        if (!onDropCharacter) return;
        const characterId = event.dataTransfer.getData('application/x-gb-character');
        if (!characterId) return;
        // Drop where the pointer is, centred on the piece rather than hanging
        // off its top-left corner.
        const world = screenToWorld(screenPoint(event), view);
        const cell = worldToCell(world, scene.grid);
        onDropCharacter(characterId, { x: cell.col, y: cell.row });
      }}
      sx={{
        ...hostSx,
        ...(fillViewport ? fillViewportSx : null),
        ...(covering ? coveringSx : null),
        cursor: cameraLocked ? 'default' : cursorFor(paintMode),
      }}
    >
      {imageUrl ? (
        <Box
          component="img"
          src={imageUrl}
          alt=""
          draggable={false}
          onLoad={(event) => {
            const size = {
              width: event.currentTarget.naturalWidth,
              height: event.currentTarget.naturalHeight,
            };
            setLoadedImageSize(size);
            // The editor needs it too: fog and the play area are both sized from
            // the map, and only the <img> knows how big it really is.
            onImageSize?.(size);
          }}
          sx={{
            position: 'absolute',
            left: 0,
            top: 0,
            transformOrigin: '0 0',
            transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})`,
            imageRendering: 'auto',
            userSelect: 'none',
            pointerEvents: 'none',
          }}
        />
      ) : (
        <Typography sx={placeholderSx}>Upload a map image to start building this scene.</Typography>
      )}

      {/* Rendered whenever the map is a hexcrawl, not only while its mesh is
          on: the painted country and the picked hex are content, and the grid
          being off — or zoomed past reading — is no reason to lose them. */}
      {!backgroundOnly && isHexGrid(scene.grid) ? (
        <HexGrid
          outlined={gridVisible}
          grid={scene.grid}
          view={view}
          viewportSize={viewportSize}
          cells={hexCells}
          selected={selectedHex}
          // The map itself is the final mask. Edge hexes remain usable, but the
          // parts of their fill and outline beyond the picture are cut away.
          clipRect={hexMapBox}
          clipPolygon={hexPlayAreaClip}
          // A hexcrawl map is styled like any other: the colour and the weight
          // the scene carries are the grid's, whichever shape it is.
          lineColor={gridColor}
          lineWidth={gridLine}
        />
      ) : null}

      {gridVisible && !isHexGrid(scene.grid) ? (
        <SquareGrid
          grid={scene.grid}
          view={view}
          viewportSize={viewportSize}
          lineColor={gridColor}
          lineWidth={gridLine}
          // Squares outside the play area are staging space, not board space.
          clipRect={scene.playArea ? playAreaBox(scene, view) : null}
        />
      ) : null}

      {/* The edge of what the players receive. Drawn for the GM only — for a
          player it would be a line around everything they can see anyway. */}
      {scene.playArea && showPlayArea && !backgroundOnly ? (isHexGrid(scene.grid) ? (
        <Box
          component="svg"
          aria-hidden
          data-play-area={hexPlayAreaMatchesMap ? 'hex-map' : 'hex-custom'}
          width="100%"
          height="100%"
          sx={playAreaSvgSx}
        >
          {hexPlayAreaMatchesMap ? (
            <rect
              x={hexMapBox.left}
              y={hexMapBox.top}
              width={hexMapBox.width}
              height={hexMapBox.height}
              {...playAreaStrokeProps}
            />
          ) : (
            <polygon
              points={hexPlayAreaPolygon(scene, view)}
              {...playAreaStrokeProps}
            />
          )}
        </Box>
      ) : (() => {
        const topLeft = worldToScreen(cellToWorld({ col: scene.playArea.x, row: scene.playArea.y }, scene.grid), view);
        const cell = cellSize(scene.grid) * view.zoom;
        return (
          <Box
            aria-hidden
            data-play-area="square"
            sx={{
              position: 'absolute',
              left: 0,
              top: 0,
              transform: `translate(${topLeft.x}px, ${topLeft.y}px)`,
              width: scene.playArea.w * cell,
              height: scene.playArea.h * cell,
              border: `2px dashed ${vttAlpha(VTT_COLORS.gold, 0.7)}`,
              boxSizing: 'border-box',
              pointerEvents: 'none',
            }}
          />
        );
      })()) : null}

      {/* Committed strokes go under the fog: a note scribbled on a room the
          party has not reached is the GM's business until they get there. The
          live stroke, the ruler and the laser go over everything — see below. */}
      <DrawingCanvas
        drawings={backgroundOnly ? null : shownDrawings}
        selectedId={backgroundOnly ? null : selectedDrawingId}
        grid={scene.grid}
        view={view}
      />

      <FogCanvas fog={backgroundOnly ? null : fog} grid={scene.grid} view={view} opacity={fogOpacity} />

      <TokenLayer
        tokens={backgroundOnly ? [] : tokens}
        drag={drag}
        resize={resize}
        rotate={rotate}
        view={view}
        viewportSize={viewportSize}
        grid={scene.grid}
        activeLayer={activeLayer}
        playArea={scene.playArea}
        showPlayArea={showPlayArea}
        cameraLocked={cameraLocked}
        paintMode={paintMode}
        canMove={canMove}
        selectedMapObjectId={selectedMapObjectId}
        canSetDeathSaves={canSetDeathSaves}
        conditionEntries={conditionEntries}
        presentedInspection={presentedInspection}
        onInspectionChange={onTokenInspection}
        onBeginDrag={beginTokenDrag}
        onBeginResize={beginTokenResize}
        onBeginRotate={beginTokenRotate}
        onDeathSaveChange={onDeathSaveChange}
        onContextMenu={onContextMenu}
      />

      {/* Atmosphere belongs in front of the world — including its pieces — but
          behind rulers, lasers and controls. A single viewport-sized shader is
          shared by battlemap and establishing-shot modes. */}
      <AtmosphereOverlay atmosphere={atmosphere} />

      {placementDrag && placementHover && !backgroundOnly ? (() => {
        const token = { ...placementDrag.token, ...placementHover };
        const rect = tokenWorldRect(token, scene.grid);
        const at = worldToScreen(rect, view);
        return (
          <Box
            data-placement-preview
            sx={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: rect.width * view.zoom,
              height: rect.height * view.zoom,
              transform: `translate(${at.x}px, ${at.y}px)`,
              opacity: 0.88,
              pointerEvents: 'none',
              zIndex: 5,
              filter: `drop-shadow(0 5px 8px ${vttAlpha(VTT_COLORS.black, 0.75)})`,
            }}
          >
            <TokenSprite
              token={token}
              size="100%"
              interactive={false}
              movable={false}
              conditionEntries={conditionEntries}
            />
            {placementDrag.count > 1 ? <Box sx={placementCountSx}>×{placementDrag.count}</Box> : null}
          </Box>
        );
      })() : null}

      {controls ? (
        <>
          <Tooltip title={controlsOpen ? 'Hide the tools' : 'Show the tools'}>
            <IconButton
              size="small"
              data-viewport-control
              aria-label={controlsOpen ? 'Hide the tools' : 'Show the tools'}
              aria-expanded={controlsOpen}
              onClick={() => setControlsOpen((open) => !open)}
              sx={{ ...roundBtnSx, right: 8, top: 8 }}
            >
              {controlsOpen ? <X size={16} /> : <Settings2 size={16} />}
            </IconButton>
          </Tooltip>

          {/* Rendered as-is: the rail positions itself against the map. Wrapping
              it in a second absolutely positioned box left it anchored to that
              box instead, which is why the tools were nowhere to be seen. */}
          {controlsOpen ? controls : null}
        </>
      ) : null}

      {fullscreenActive && fullscreenSheet ? (
        <>
          <Button
            size="small"
            variant={floatingSheetOpen ? 'contained' : 'outlined'}
            startIcon={<ScrollText size={14} />}
            data-viewport-control
            aria-label={floatingSheetOpen ? 'Hide floating character sheet' : 'Show floating character sheet'}
            onClick={() => setFloatingSheetOpen((open) => !open)}
            sx={fullscreenSheetButtonSx}
          >
            Sheet
          </Button>
          {floatingSheetOpen ? (
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
        </>
      ) : null}

      {imageSwitch ? (
        <Box data-viewport-control sx={imageSwitchSx}>{imageSwitch}</Box>
      ) : null}

      {layerSwitch ? (
        <Box data-viewport-control sx={layerSwitchSx}>{layerSwitch}</Box>
      ) : null}

      {showFullscreenControl ? (
        <Tooltip title={fullscreenActive ? 'Leave fullscreen' : 'Fullscreen map'}>
          <IconButton
            size="small"
            data-viewport-control
            aria-label={fullscreenActive ? 'Leave fullscreen' : 'Fullscreen map'}
            onClick={toggleFullscreen}
            sx={fullscreenBtnSx}
          >
            {fullscreenActive ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </IconButton>
        </Tooltip>
      ) : null}

      {/* Over the piece that rolled: the position is recomputed here rather than
          stored, so a bubble follows its creature while the map is panned. */}
      {/* Screen space, over everything: the dice are on the table, not on the
          map. A throw with no piece to land next to lands in the middle. */}
      <DiceTray
        onThrowSettled={onDiceSettled}
        throws={(diceThrows || []).map(({ roll, token }) => {
          const rect = token ? tokenWorldRect(token, scene.grid) : null;
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

      {/* Where the party stands. Drawn for everyone looking at the map — the
          players and the projector included — because a hexcrawl with no marker
          is a coloured map nobody can point at. */}
      {!backgroundOnly && partyHex && isHexGrid(scene.grid) ? (() => {
        const centre = worldToScreen(hexToWorld(partyHex, scene.grid), view);
        // Two thirds of the hex it stands in: the marker is read from across the
        // table, and a pin the size of a token label is not.
        const glyph = Math.min(96, Math.max(20, hexWidth(scene.grid) * view.zoom * 0.66));
        return (
          <Box
            aria-hidden
            data-party-hex={`${partyHex.q},${partyHex.r}`}
            sx={{
              position: 'absolute',
              left: 0,
              top: 0,
              // The pin points at the hex, so it hangs above the centre rather
              // than sitting on it.
              transform: `translate(${centre.x}px, ${centre.y}px) translate(-50%, -78%)`,
              pointerEvents: 'none',
              color: VTT_COLORS.gold,
              filter: `drop-shadow(0 2px 4px ${vttAlpha(VTT_COLORS.black, 0.85)})`,
              zIndex: 5,
            }}
          >
            <MapPin size={glyph} fill={vttAlpha(VTT_COLORS.surfaceRaised, 0.85)} strokeWidth={2} />
          </Box>
        );
      })() : null}

      {hexBubble ? (() => {
        const centre = worldToScreen(hexToWorld(hexBubble.hex, scene.grid), view);
        return (
          <HexBubble
            bubble={hexBubble}
            x={centre.x}
            // Clear of the hex itself: half its height, plus the tail.
            y={centre.y - (hexHeight(scene.grid) * view.zoom) / 2 - 4}
            onOpen={onHexBubbleOpen}
          />
        );
      })() : null}

      {(rollBubbles || []).map(({ roll, token }) => {
        const rect = tokenWorldRect(token, scene.grid);
        const at = worldToScreen(rect, view);
        return (
          <RollBubble
            key={roll.id}
            roll={roll}
            x={at.x + (rect.width * view.zoom) / 2}
            y={at.y - 6}
          />
        );
      })}

      {/* Conversation, not annotation: the stroke still under the pointer, the
          ruler and everyone's laser, drawn above the fog and above the pieces so
          pointing at something in the dark still means something. */}
      <DrawingCanvas
        onTop
        live={strokeRef.current.length
          ? { points: strokeRef.current, color: drawColor, width: drawWidth, tick: strokeTick }
          : null}
        measure={measure || remoteMeasure || measured?.trail}
        grid={scene.grid}
        view={view}
      />
      <LaserOverlay
        lasers={lasers}
        localPointRef={laserPointRef}
        localActive={paintMode === 'laser'}
        grid={scene.grid}
        view={view}
      />

      {/* What the brush is about to touch. Guessing the reach of a fog brush from
          its number alone is the fastest way to reveal a room you meant to keep
          dark. */}
      {hover && brushRadius > 0 ? (
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: brushRadius * 2,
            height: brushRadius * 2,
            transform: `translate(${hover.x - brushRadius}px, ${hover.y - brushRadius}px)`,
            borderRadius: '50%',
            border: `1px solid ${vttAlpha(VTT_COLORS.white, 0.85)}`,
            boxShadow: `0 0 0 1px ${vttAlpha(VTT_COLORS.black, 0.6)} inset`,
            pointerEvents: 'none',
            zIndex: 4,
          }}
        />
      ) : null}

      {/* Outside the token nodes: they clip to a circle, and the badge has to
          sit clear of the piece to stay readable. */}
      {/* Marked as a control: without it the host captures the pointer on the
          way down and the close button never receives the click. */}
      <Box data-viewport-control>{toast}</Box>

      {measured ? (
        <Box
          sx={{
            ...distanceSx,
            // `measured.x` is the token centre. Offset by half the badge's own
            // width, not by a fixed rem value: "5 ft" and "120 ft" must both
            // remain centred over the piece.
            transform: `translate(${measured.x}px, ${measured.y}px) translateX(-50%)`,
          }}
        >
          {measured.label}
        </Box>
      ) : null}
    </Box>
  );
}

// How far the piece under the pointer has travelled, and where to show it.
// Measured against the square it will land on, so the number matches what the
// drop will actually cost.
function measurementBadge(tokens, drag, grid, view, feetPerCell) {
  if (!drag) return null;
  const token = (tokens || []).find((item) => item.id === drag.id);
  // Scenery does not walk anywhere: a distance badge over a rug is noise.
  if (!token || isMapPiece(token)) return null;
  // On hexes the landing is a hex, and the count is in steps rather than in
  // squares with a diagonal rule attached.
  const shape = isHexGrid(grid) ? 'hex' : 'square';
  const landing = shape === 'hex'
    ? (() => {
      const cell = axialRound({ q: drag.x, r: drag.y });
      return { x: cell.q, y: cell.r };
    })()
    : { x: Math.round(drag.x), y: Math.round(drag.y) };
  const label = movementLabel(token, landing, {
    feetPerCell, milesPerCell: overlandMiles(grid), shape,
  });
  if (!label) return null;
  const rect = tokenWorldRect({ ...token, ...drag }, grid);
  const at = worldToScreen(rect, view);

  // Where the piece is being carried from, in cells and from its centre rather
  // than its corner, so the line runs between the two squares and not between
  // their top-left corners.
  const half = { x: Math.max(0.1, token.w || 1) / 2, y: Math.max(0.1, token.h || 1) / 2 };
  // The trail is drawn by the ruler, which works in the same units as a drawing:
  // world pixels over the cell size. A hex piece has to be converted, because
  // its stored q/r are not that.
  const trailPoint = (position) => {
    if (shape !== 'hex') {
      return { x: (position.x || 0) + half.x, y: (position.y || 0) + half.y };
    }
    const centre = hexToWorld({ q: position.x, r: position.y }, grid);
    const size = cellSize(grid);
    return {
      x: (centre.x - (grid.offsetX || 0)) / size,
      y: (centre.y - (grid.offsetY || 0)) / size,
    };
  };
  return {
    label,
    x: at.x + (rect.width * view.zoom) / 2,
    // Above the piece: below it belongs to the hit point bars and the name.
    y: at.y - 20,
    // Drawn by the same code as the ruler, because it is the same thing: a
    // measured line from here to there.
    trail: {
      shape: 'line',
      from: trailPoint(token),
      to: trailPoint({ x: drag.x, y: drag.y }),
    },
  };
}

// Where the browser refuses real fullscreen, the map takes the window instead.
// Below MUI's modal layer on purpose: a dialog opened from the map still has to
// come out on top of it.
const coveringSx = {
  position: 'fixed',
  inset: 0,
  zIndex: 1200,
  // `dvh`, not `%`: a fixed box measured against the initial containing block is
  // as tall as the page believes the window to be, which on a phone includes the
  // strip behind the browser's own bars — and the controls along the bottom of
  // the map went under them.
  height: '100dvh',
  maxHeight: 'none',
  borderRadius: 0,
};

const hostSx = {
  position: 'relative',
  overflow: 'hidden',
  // Takes what the page has left rather than subtracting a hand-counted number
  // of pixels from the window. The old `calc(100vh - 164px)` was the app bar
  // plus the padding plus the title row added up by hand: it broke whenever the
  // title wrapped, and on a phone `100vh` includes the strip behind the address
  // bar, so the bottom of the board sat under the browser's own chrome.
  flex: 1,
  height: '100%',
  // Every ancestor already opts into shrinking. A fixed 320 px floor overflowed
  // the short height of a phone in landscape, so the viewport was clipped before
  // its bottom-left and bottom-right controls. The stacked sheet layout gives
  // its map cell an explicit floor of its own.
  minHeight: 0,
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 1,
  // Match the fully covered player fog exactly. When a map ends, the empty
  // viewport is therefore indistinguishable from unexplored territory and
  // gives the table no silhouette of the image bounds.
  bgcolor: VTT_COLORS.black,
  touchAction: 'none',
  // The fullscreen element keeps its own height rule, or the map would sit in a
  // letterboxed strip in the middle of a black screen. The webkit spelling is
  // still what Safari matches.
  '&:fullscreen': { width: '100vw', height: '100vh', maxHeight: 'none', borderRadius: 0 },
  '&:-webkit-full-screen': { width: '100vw', height: '100vh', maxHeight: 'none', borderRadius: 0 },
};

const fillViewportSx = {
  width: '100vw',
  height: '100vh',
  minHeight: 0,
  maxHeight: 'none',
  border: 0,
  borderRadius: 0,
};

// Where the play area sits on screen, in viewport pixels.
function playAreaBox(scene, view) {
  const cell = cellSize(scene.grid) * view.zoom;
  const topLeft = worldToScreen(cellToWorld({ col: scene.playArea.x, row: scene.playArea.y }, scene.grid), view);
  return {
    left: topLeft.x,
    top: topLeft.y,
    width: scene.playArea.w * cell,
    height: scene.playArea.h * cell,
  };
}

// A rectangular range of axial coordinates is a parallelogram on screen. The
// half-cell inset puts the edge between included and staged hex centres, which
// makes the line agree with the same x/y test used by the client and SQL.
function hexPlayAreaPolygon(scene, view) {
  const area = scene.playArea;
  const corners = [
    { q: area.x - 0.5, r: area.y - 0.5 },
    { q: area.x + area.w - 0.5, r: area.y - 0.5 },
    { q: area.x + area.w - 0.5, r: area.y + area.h - 0.5 },
    { q: area.x - 0.5, r: area.y + area.h - 0.5 },
  ];
  return corners
    .map((corner) => worldToScreen(hexToWorld(corner, scene.grid), view))
    .map((point) => `${point.x},${point.y}`)
    .join(' ');
}

// Images always live at world origin. Unlike a cell-derived play area, this
// box follows the last physical pixel even when an edge cuts through a hex.
function imageBox(imageSize, view) {
  const topLeft = worldToScreen({ x: 0, y: 0 }, view);
  return {
    left: topLeft.x,
    top: topLeft.y,
    width: imageSize.width * view.zoom,
    height: imageSize.height * view.zoom,
  };
}

function samePlayArea(left, right) {
  return left?.x === right?.x
    && left?.y === right?.y
    && left?.w === right?.w
    && left?.h === right?.h;
}

function pointInBox(point, box) {
  return point.x >= box.left
    && point.y >= box.top
    && point.x < box.left + box.width
    && point.y < box.top + box.height;
}

const roundBtnSx = {
  position: 'absolute',
  zIndex: 6,
  color: VTT_COLORS.gold,
  bgcolor: vttAlpha(VTT_COLORS.ink, 0.8),
  border: `1px solid ${vttAlpha(VTT_COLORS.gold, 0.35)}`,
  '&:hover': { bgcolor: vttAlpha(VTT_COLORS.ink, 0.95) },
};

const playAreaSvgSx = {
  position: 'absolute',
  inset: 0,
  overflow: 'hidden',
  pointerEvents: 'none',
};

const playAreaStrokeProps = {
  fill: 'none',
  stroke: vttAlpha(VTT_COLORS.gold, 0.7),
  strokeWidth: 2,
  strokeDasharray: '7 5',
};

const fullscreenSheetButtonSx = {
  position: 'absolute',
  right: 46,
  top: 8,
  zIndex: 7,
  height: 32,
  minWidth: 88,
  borderColor: vttAlpha(VTT_COLORS.gold, 0.42),
  bgcolor: vttAlpha(VTT_COLORS.ink, 0.82),
  fontFamily: '"Cinzel", Georgia, serif',
  fontSize: '0.62rem',
  letterSpacing: '0.07em',
  '&:hover': { bgcolor: vttAlpha(VTT_COLORS.ink, 0.96) },
};

// Bottom right, above everything, and out of the way of the pieces.
const fullscreenBtnSx = { ...roundBtnSx, right: 8, bottom: 8 };

// Top left, and everything about pictures with it: the switch and the panel
// that manages them are one job, and splitting them across two corners meant
// crossing the map to finish a single thought.
const imageSwitchSx = {
  position: 'absolute',
  left: 8,
  top: 8,
  // Bounded at the bottom as well, so the panel it holds has a height to measure
  // itself against. Sized against the window instead, the panel grew past the
  // map it lives in and the map's own edge cut it off — the page has no scroll
  // to reach the rest with, and in fullscreen there is no page at all.
  bottom: 8,
  display: 'flex',
  // Stretched rather than top-aligned: a child with `height: 100%` needs a
  // parent whose height is definite, and that is the whole trick here.
  alignItems: 'stretch',
  zIndex: 6,
  // Now that it runs the height of the map, the strip must not take the clicks
  // along it: it is a place to stand, not a control. What it holds opts back in.
  pointerEvents: 'none',
  cursor: 'default',
};

// Bottom left, opposite it, where a constant piece of state belongs.
const layerSwitchSx = {
  position: 'absolute',
  left: 8,
  bottom: 8,
  zIndex: 6,
  borderRadius: 1,
  cursor: 'default',
};

const placeholderSx = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'text.secondary',
  fontStyle: 'italic',
  textAlign: 'center',
  px: 2,
};

const distanceSx = {
  position: 'absolute',
  left: 0,
  top: 0,
  px: 0.75,
  borderRadius: 1,
  bgcolor: vttAlpha(VTT_COLORS.ink, 0.9),
  color: VTT_COLORS.gold,
  fontFamily: '"Cinzel", Georgia, serif',
  fontSize: '0.65rem',
  whiteSpace: 'nowrap',
  pointerEvents: 'none',
};

const placementCountSx = {
  position: 'absolute',
  right: -8,
  bottom: -8,
  minWidth: 24,
  height: 24,
  px: 0.5,
  borderRadius: 12,
  bgcolor: VTT_COLORS.gold,
  color: VTT_COLORS.ink,
  border: `1px solid ${VTT_COLORS.ink}`,
  fontSize: '0.7rem',
  fontWeight: 900,
  lineHeight: '22px',
  textAlign: 'center',
};
