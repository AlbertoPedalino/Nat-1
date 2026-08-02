import { useCallback, useEffect, useRef, useState } from 'react';
import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import { Maximize2, Minimize2, Settings2, X } from 'lucide-react';
import { brushCells } from '../../../shared/vtt/fog.js';
import {
  DEFAULT_VIEW,
  cellSize,
  cellToWorld,
  dropPosition,
  fitView,
  panBy,
  screenToWorld,
  tokenWorldRect,
  worldToCell,
  worldToScreen,
  zoomAt,
} from '../../../shared/vtt/geometry.js';
import { measureLabel, movementLabel } from '../../../shared/vtt/measure.js';
import { isTokenInPlay } from '../../../shared/vtt/scene.js';
import DrawingCanvas from './DrawingCanvas.jsx';
import FogCanvas from './FogCanvas.jsx';
import TokenSprite from './TokenSprite.jsx';

const WHEEL_STEP = 1.12;
const DRAG_BROADCAST_MS = 40;
const LASER_BROADCAST_MS = 50;

// Inline SVG cursors so the pointer says which tool is in hand. Hotspot at the
// nib for the pencil and at the corner of the block for the eraser, or the mark
// lands where the cursor is not.
const PENCIL_CURSOR = "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23e8c96a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M12 20h9'/><path d='M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z'/></svg>\") 2 22, crosshair";
const ERASER_CURSOR = "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23de675f' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='m7 21-4.3-4.3a1 1 0 0 1 0-1.4L15 3a2 2 0 0 1 3 0l3 3a2 2 0 0 1 0 3L10.5 19.5'/><path d='M22 21H7'/></svg>\") 3 21, crosshair";

// The tools that paint an area rather than acting on one point.
const BRUSH_MODES = ['reveal', 'hide', 'draw', 'erase'];

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
  selectedId,
  snap,
  canMove,
  fog,
  fogOpacity = 1,
  paintMode = 'select',
  brushSize = 3,
  feetPerCell,
  activeLayer,
  showPlayArea = false,
  // Background mode is a picture on a screen, not a board: the party is meant to
  // look at it, not play on it.
  backgroundOnly = false,
  onImageSize,
  onSelect,
  onDragToken,
  onMoveToken,
  onPaint,
  onPaintEnd,
  onContextMenu,
  onDropCharacter,
  drawings,
  drawColor,
  drawWidth,
  onDrawEnd,
  onErase,
  onWriteNote,
  onLaser,
  lasers,
  measureShape,
  feetPerCellForRuler,
  onMeasure,
  remoteMeasure,
  controls,
  layerSwitch,
  imageSwitch,
}) {
  const hostRef = useRef(null);
  const dragRef = useRef(null);
  const lastLaserRef = useRef(0);
  const [view, setView] = useState(DEFAULT_VIEW);
  const [drag, setDrag] = useState(null);
  // The stroke in progress lives in a ref, not in state. Accumulating it in
  // state meant the commit ran inside a state updater — a side effect in a
  // function React may call more than once or defer, which is why the second
  // stroke onwards came out as a single dot.
  const strokeRef = useRef([]);
  const [strokeTick, setStrokeTick] = useState(0);
  const [imageSize, setImageSize] = useState(null);
  const [fullscreen, setFullscreen] = useState(false);
  // The controls live inside the viewport rather than around it, which is the
  // only way they survive fullscreen — a fullscreen element hides its siblings.
  const [controlsOpen, setControlsOpen] = useState(false);
  const [measure, setMeasure] = useState(null);
  // Where the cursor is, so a brush can show what it is about to cover. Tracked
  // only while a brush is in hand: a state update per mouse move is not worth
  // paying for while merely moving pieces around.
  const [hover, setHover] = useState(null);

  // Fit once per picture: refitting on every render would fight the user's pan,
  // but switching between the battlemap and the background has to reframe — the
  // two are rarely the same shape.
  useEffect(() => {
    if (!imageSize || !hostRef.current) return;
    const box = hostRef.current.getBoundingClientRect();
    setView(fitView({
      imageWidth: imageSize.width,
      imageHeight: imageSize.height,
      viewportWidth: box.width,
      viewportHeight: box.height,
    }));
  }, [imageSize, imageUrl]);

  // Real fullscreen rather than a CSS overlay: the map is the whole point of the
  // page, and the browser chrome is worth the pixels at the table.
  const toggleFullscreen = useCallback(() => {
    const host = hostRef.current;
    if (!host) return;
    try {
      if (document.fullscreenElement) document.exitFullscreen();
      else host.requestFullscreen?.();
    } catch (_) {
      // Denied or unsupported: the button simply does nothing rather than
      // breaking the scene.
    }
  }, []);

  // Escape and the browser's own control leave fullscreen without telling us,
  // so the icon follows the document rather than our last click.
  useEffect(() => {
    const sync = () => setFullscreen(document.fullscreenElement === hostRef.current);
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, []);

  const screenPoint = useCallback((event) => {
    const box = hostRef.current?.getBoundingClientRect();
    return { x: event.clientX - (box?.left || 0), y: event.clientY - (box?.top || 0) };
  }, []);

  const handleWheel = useCallback((event) => {
    event.preventDefault();
    const factor = event.deltaY < 0 ? WHEEL_STEP : 1 / WHEEL_STEP;
    setView((current) => zoomAt(current, factor, screenPoint(event)));
  }, [screenPoint]);

  // Wheel has to be a non-passive native listener: React's onWheel is passive,
  // and preventDefault there is ignored, so the page scrolls while zooming.
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;
    host.addEventListener('wheel', handleWheel, { passive: false });
    return () => host.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

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

  const beginPan = (event) => {
    if (event.button !== 0 && event.button !== 1) return;
    // Controls sitting on top of the map are not the map. Without this the host
    // captures the pointer on the way down and the click never reaches the
    // button — which is exactly why fullscreen appeared to do nothing.
    if (event.target.closest?.('[data-viewport-control]')) return;
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

    if (event.button === 0 && paintMode === 'measure') {
      const at = cellPoint(point);
      dragRef.current = { kind: 'measure', from: at };
      setMeasure({ shape: measureShape, from: at, to: at, label: '' });
      return;
    }

    if (event.button === 0 && paintMode === 'laser') {
      dragRef.current = { kind: 'laser' };
      onLaser?.(cellPoint(point));
      return;
    }

    if (event.button === 0 && paintMode === 'erase') {
      dragRef.current = { kind: 'erase' };
      onErase?.(cellPoint(point));
      return;
    }
    dragRef.current = { kind: 'pan', last: point };
    onSelect?.(null);
  };

  const beginTokenDrag = (event, token) => {
    event.stopPropagation();
    onSelect?.(token.id);
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
  };

  const handlePointerMove = (event) => {
    const state = dragRef.current;
    const point = screenPoint(event);
    if (BRUSH_MODES.includes(paintMode)) setHover(point);

    // The laser follows the cursor as soon as the tool is in hand. Requiring the
    // button to be held made it look broken to everyone else: you point at
    // something, nobody sees a dot, and there is nothing on screen to say why.
    if (paintMode === 'laser' && !state) {
      const now = Date.now();
      if (now - lastLaserRef.current >= LASER_BROADCAST_MS) {
        lastLaserRef.current = now;
        onLaser?.(cellPoint(point));
      }
      return;
    }

    if (!state) return;

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

    if (state.kind === 'laser') {
      onLaser?.(cellPoint(point));
      return;
    }

    if (state.kind === 'note') return;

    if (state.kind === 'measure') {
      const at = cellPoint(point);
      const next = {
        shape: measureShape,
        from: state.from,
        to: at,
        label: measureLabel(measureShape, state.from, at, { feetPerCell: feetPerCellForRuler }),
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
      setView((current) => panBy(current, dx, dy));
      return;
    }

    // Follow the pointer unsnapped so the piece does not stutter between cells;
    // the snap happens once, on drop.
    const next = dropPosition({
      pointerWorld: screenToWorld(point, view),
      grabOffset: state.grabOffset,
      grid: scene.grid,
      snap: false,
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
    const state = dragRef.current;
    dragRef.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);

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

    if (state?.kind === 'erase' || state?.kind === 'note') return;

    // The ruler disappears on release; nothing is written down.
    if (state?.kind === 'measure') {
      setMeasure(null);
      onMeasure?.(null);
      return;
    }

    // The dot fades on its own at the far end; nothing is written down.
    if (state?.kind === 'laser') {
      onLaser?.(null);
      return;
    }
    if (!state || state.kind !== 'token') return;

    const landing = dropPosition({
      pointerWorld: screenToWorld(screenPoint(event), view),
      grabOffset: state.grabOffset,
      grid: scene.grid,
      snap,
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

  const size = cellSize(scene.grid) * view.zoom;
  const origin = worldToScreen({ x: 0, y: 0 }, view);
  const gridVisible = !backgroundOnly && scene.grid.visible && size > 4;
  const measured = measurementBadge(tokens, drag, scene.grid, view, feetPerCell);
  const brushRadius = brushRadiusFor(paintMode, { brushSize, drawWidth, cell: size });

  return (
    <Box
      ref={hostRef}
      onPointerDown={beginPan}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerLeave={() => {
        setHover(null);
        if (paintMode === 'laser') onLaser?.(null);
      }}
      onContextMenu={(event) => event.preventDefault()}
      onDragOver={(event) => { if (onDropCharacter) event.preventDefault(); }}
      onDrop={(event) => {
        if (!onDropCharacter) return;
        event.preventDefault();
        const characterId = event.dataTransfer.getData('application/x-gb-character');
        if (!characterId) return;
        // Drop where the pointer is, centred on the piece rather than hanging
        // off its top-left corner.
        const world = screenToWorld(screenPoint(event), view);
        const cell = worldToCell(world, scene.grid);
        onDropCharacter(characterId, { x: cell.col, y: cell.row });
      }}
      sx={{ ...hostSx, cursor: cursorFor(paintMode) }}
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
            setImageSize(size);
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

      {gridVisible ? (
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            // Clipped to the play area when there is one: squares drawn over the
            // staging space suggest it is part of the board, which it is not.
            ...(scene.playArea ? playAreaBox(scene, view) : { inset: 0 }),
            pointerEvents: 'none',
            backgroundImage: 'linear-gradient(to right, rgba(232,201,106,0.25) 1px, transparent 1px),'
              + 'linear-gradient(to bottom, rgba(232,201,106,0.25) 1px, transparent 1px)',
            backgroundSize: `${size}px ${size}px`,
            // Clipped, the box already starts on a grid line — the play area is
            // measured in whole cells — so the pattern begins at its corner.
            backgroundPosition: scene.playArea
              ? '0 0'
              : `${origin.x + scene.grid.offsetX * view.zoom}px ${origin.y + scene.grid.offsetY * view.zoom}px`,
          }}
        />
      ) : null}

      {/* The edge of what the players receive. Drawn for the GM only — for a
          player it would be a line around everything they can see anyway. */}
      {scene.playArea && showPlayArea && !backgroundOnly ? (() => {
        const topLeft = worldToScreen(cellToWorld({ col: scene.playArea.x, row: scene.playArea.y }, scene.grid), view);
        const cell = cellSize(scene.grid) * view.zoom;
        return (
          <Box
            aria-hidden
            sx={{
              position: 'absolute',
              left: 0,
              top: 0,
              transform: `translate(${topLeft.x}px, ${topLeft.y}px)`,
              width: scene.playArea.w * cell,
              height: scene.playArea.h * cell,
              border: '2px dashed rgba(232,201,106,0.7)',
              boxSizing: 'border-box',
              pointerEvents: 'none',
            }}
          />
        );
      })() : null}

      {/* Committed strokes go under the fog: a note scribbled on a room the
          party has not reached is the GM's business until they get there. The
          live stroke, the ruler and the laser go over everything — see below. */}
      <DrawingCanvas
        drawings={backgroundOnly ? null : drawings}
        grid={scene.grid}
        view={view}
      />

      <FogCanvas fog={backgroundOnly ? null : fog} grid={scene.grid} view={view} opacity={fogOpacity} />

      {(backgroundOnly ? [] : tokens).map((token) => {
        const live = drag?.id === token.id ? { ...token, x: drag.x, y: drag.y } : token;
        const rect = tokenWorldRect(live, scene.grid);
        const at = worldToScreen(rect, view);
        // A piece on another layer is visible but inert: no cursor, no drag, no
        // menu. That is what "editing a layer" means here.
        const onActiveLayer = !activeLayer || token.layer === activeLayer;
        // Staged outside the play area: the GM sees it faintly, the players do
        // not receive it at all.
        const staged = showPlayArea && !isTokenInPlay(live, scene.playArea);
        return (
          <Box
            key={token.id}
            sx={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: rect.width * view.zoom,
              height: rect.height * view.zoom,
              transform: `translate(${at.x}px, ${at.y}px)`,
            }}
          >
            <TokenSprite
              token={live}
              size="100%"
              selected={selectedId === token.id}
              dimmed={!onActiveLayer}
              staged={staged}
              interactive={onActiveLayer}
              movable={canMove(token)}
              onPointerDown={(event) => (onActiveLayer ? beginTokenDrag(event, token) : undefined)}
              onContextMenu={(event) => {
                if (!onActiveLayer || !onContextMenu) return;
                event.preventDefault();
                event.stopPropagation();
                onSelect?.(token.id);
                onContextMenu(token, { x: event.clientX, y: event.clientY });
              }}
            />
          </Box>
        );
      })}

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

      {imageSwitch ? (
        <Box data-viewport-control sx={imageSwitchSx}>{imageSwitch}</Box>
      ) : null}

      {layerSwitch ? (
        <Box data-viewport-control sx={layerSwitchSx}>{layerSwitch}</Box>
      ) : null}

      <Tooltip title={fullscreen ? 'Leave fullscreen' : 'Fullscreen map'}>
        <IconButton
          size="small"
          data-viewport-control
          aria-label={fullscreen ? 'Leave fullscreen' : 'Fullscreen map'}
          onClick={toggleFullscreen}
          sx={fullscreenBtnSx}
        >
          {fullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </IconButton>
      </Tooltip>

      {/* Conversation, not annotation: the stroke still under the pointer, the
          ruler and everyone's laser, drawn above the fog and above the pieces so
          pointing at something in the dark still means something. */}
      <DrawingCanvas
        onTop
        live={strokeRef.current.length
          ? { points: strokeRef.current, color: drawColor, width: drawWidth, tick: strokeTick }
          : null}
        lasers={lasers}
        measure={measure || remoteMeasure}
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
            border: '1px solid rgba(255,255,255,0.85)',
            boxShadow: '0 0 0 1px rgba(0,0,0,0.6) inset',
            pointerEvents: 'none',
            zIndex: 4,
          }}
        />
      ) : null}

      {/* Outside the token nodes: they clip to a circle, and the badge has to
          sit clear of the piece to stay readable. */}
      {measured ? (
        <Box sx={{ ...distanceSx, transform: `translate(${measured.x}px, ${measured.y}px)` }}>
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
  if (!token) return null;
  const landing = { x: Math.round(drag.x), y: Math.round(drag.y) };
  const label = movementLabel(token, landing, { feetPerCell });
  if (!label) return null;
  const rect = tokenWorldRect({ ...token, ...drag }, grid);
  const at = worldToScreen(rect, view);
  return {
    label,
    x: at.x + (rect.width * view.zoom) / 2,
    // Above the piece: below it belongs to the hit point bars and the name.
    y: at.y - 20,
  };
}

const hostSx = {
  position: 'relative',
  overflow: 'hidden',
  // Sized to what is actually above it — the app bar, the page padding and the
  // scene's title row — rather than to a round number with room to spare. The
  // map is the page; leaving a strip of empty background under it was waste.
  height: { xs: '70vh', md: 'calc(100vh - 164px)' },
  minHeight: 360,
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 1,
  bgcolor: '#0b0a09',
  touchAction: 'none',
  // The fullscreen element keeps its own height rule, or the map would sit in a
  // letterboxed strip in the middle of a black screen. The webkit spelling is
  // still what Safari matches.
  '&:fullscreen': { width: '100vw', height: '100vh', maxHeight: 'none', borderRadius: 0 },
  '&:-webkit-full-screen': { width: '100vw', height: '100vh', maxHeight: 'none', borderRadius: 0 },
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

const roundBtnSx = {
  position: 'absolute',
  zIndex: 6,
  color: '#e8c96a',
  bgcolor: 'rgba(15,14,13,0.8)',
  border: '1px solid rgba(232,201,106,0.35)',
  '&:hover': { bgcolor: 'rgba(15,14,13,0.95)' },
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
  zIndex: 6,
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
  marginLeft: '-1.5rem',
  px: 0.75,
  borderRadius: 1,
  bgcolor: 'rgba(15,14,13,0.9)',
  color: '#e8c96a',
  fontFamily: '"Cinzel", Georgia, serif',
  fontSize: '0.65rem',
  whiteSpace: 'nowrap',
  pointerEvents: 'none',
};
