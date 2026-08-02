import { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Typography } from '@mui/material';
import {
  DEFAULT_VIEW,
  cellSize,
  dropPosition,
  fitView,
  panBy,
  screenToWorld,
  tokenWorldRect,
  worldToScreen,
  zoomAt,
} from '../../../shared/vtt/geometry.js';

const WHEEL_STEP = 1.12;

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
  onSelect,
  onMoveToken,
}) {
  const hostRef = useRef(null);
  const dragRef = useRef(null);
  const [view, setView] = useState(DEFAULT_VIEW);
  const [drag, setDrag] = useState(null);
  const [imageSize, setImageSize] = useState(null);

  // Fit once per image: refitting on every render would fight the user's pan.
  useEffect(() => {
    if (!imageSize || !hostRef.current) return;
    const box = hostRef.current.getBoundingClientRect();
    setView(fitView({
      imageWidth: imageSize.width,
      imageHeight: imageSize.height,
      viewportWidth: box.width,
      viewportHeight: box.height,
    }));
  }, [imageSize]);

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

  const beginPan = (event) => {
    if (event.button !== 0 && event.button !== 1) return;
    dragRef.current = { kind: 'pan', last: screenPoint(event) };
    event.currentTarget.setPointerCapture?.(event.pointerId);
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
    if (!state) return;
    const point = screenPoint(event);

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
  };

  const handlePointerUp = (event) => {
    const state = dragRef.current;
    dragRef.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    if (!state || state.kind !== 'token') return;

    const landing = dropPosition({
      pointerWorld: screenToWorld(screenPoint(event), view),
      grabOffset: state.grabOffset,
      grid: scene.grid,
      snap,
    });
    setDrag(null);
    // One write per gesture, and only when the piece actually changed square.
    if (landing.x !== state.token.x || landing.y !== state.token.y) {
      onMoveToken?.(state.token, landing);
    }
  };

  const size = cellSize(scene.grid) * view.zoom;
  const origin = worldToScreen({ x: 0, y: 0 }, view);
  const gridVisible = scene.grid.visible && size > 4;

  return (
    <Box
      ref={hostRef}
      onPointerDown={beginPan}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      sx={hostSx}
    >
      {imageUrl ? (
        <Box
          component="img"
          src={imageUrl}
          alt=""
          draggable={false}
          onLoad={(event) => setImageSize({
            width: event.currentTarget.naturalWidth,
            height: event.currentTarget.naturalHeight,
          })}
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
            inset: 0,
            pointerEvents: 'none',
            backgroundImage: 'linear-gradient(to right, rgba(232,201,106,0.25) 1px, transparent 1px),'
              + 'linear-gradient(to bottom, rgba(232,201,106,0.25) 1px, transparent 1px)',
            backgroundSize: `${size}px ${size}px`,
            backgroundPosition: `${origin.x + scene.grid.offsetX * view.zoom}px ${origin.y + scene.grid.offsetY * view.zoom}px`,
          }}
        />
      ) : null}

      {tokens.map((token) => {
        const live = drag?.id === token.id ? { ...token, x: drag.x, y: drag.y } : token;
        const rect = tokenWorldRect(live, scene.grid);
        const at = worldToScreen(rect, view);
        return (
          <Box
            key={token.id}
            role="button"
            tabIndex={0}
            aria-label={token.label || 'Token'}
            onPointerDown={(event) => beginTokenDrag(event, token)}
            sx={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: rect.width * view.zoom,
              height: rect.height * view.zoom,
              transform: `translate(${at.x}px, ${at.y}px)`,
              borderRadius: '50%',
              boxSizing: 'border-box',
              border: '2px solid',
              borderColor: selectedId === token.id ? 'primary.main' : 'rgba(0,0,0,0.6)',
              bgcolor: token.color || 'secondary.main',
              opacity: token.layer === 'gm' ? 0.75 : 1,
              outline: token.layer === 'gm' ? '2px dashed rgba(232,201,106,0.9)' : 'none',
              outlineOffset: '-4px',
              cursor: canMove(token) ? 'grab' : 'default',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              touchAction: 'none',
              '&:focus-visible': { borderColor: 'primary.main' },
            }}
          >
            <Typography sx={labelSx}>{initials(token.label)}</Typography>
          </Box>
        );
      })}
    </Box>
  );
}

function initials(label) {
  return String(label || '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join('');
}

const hostSx = {
  position: 'relative',
  overflow: 'hidden',
  height: { xs: '55vh', md: 'calc(100vh - 260px)' },
  minHeight: 320,
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 1,
  bgcolor: '#0b0a09',
  touchAction: 'none',
  cursor: 'grab',
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

const labelSx = {
  fontSize: '0.7rem',
  fontWeight: 800,
  color: 'rgba(0,0,0,0.75)',
  pointerEvents: 'none',
};
