import { memo } from 'react';
import { Box } from '@mui/material';
import { tokenWorldRect, worldToScreen } from '../../../shared/vtt/geometry.js';
import { isTokenInPlay } from '../../../shared/vtt/scene.js';
import TokenSprite from './TokenSprite.jsx';

const VIEWPORT_OVERSCAN = 180;

function outsideViewport(rect, at, zoom, viewport) {
  if (!(viewport?.width > 0) || !(viewport?.height > 0)) return false;
  const width = rect.width * zoom;
  const height = rect.height * zoom;
  return at.x + width < -VIEWPORT_OVERSCAN
    || at.y + height < -VIEWPORT_OVERSCAN
    || at.x > viewport.width + VIEWPORT_OVERSCAN
    || at.y > viewport.height + VIEWPORT_OVERSCAN;
}

const TokenNode = memo(function TokenNode({
  token,
  view,
  grid,
  activeLayer,
  playArea,
  showPlayArea,
  interactive,
  movable,
  resizable,
  rotatable,
  canSetDeathSaves,
  conditionEntries,
  onBeginDrag,
  onBeginResize,
  onBeginRotate,
  onDeathSaveChange,
  onContextMenu,
}) {
  const rect = tokenWorldRect(token, grid);
  const at = worldToScreen(rect, view);
  const onActiveLayer = !activeLayer || token.layer === activeLayer;
  const staged = showPlayArea && !isTokenInPlay(token, playArea);

  return (
    <Box
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
        token={token}
        size="100%"
        dimmed={!onActiveLayer}
        staged={staged}
        interactive={interactive}
        movable={movable}
        resizable={resizable}
        rotatable={rotatable}
        canSetDeathSaves={canSetDeathSaves}
        conditionEntries={conditionEntries}
        onPointerDown={interactive ? (event) => onBeginDrag(event, token) : undefined}
        onResizePointerDown={(event) => (interactive ? onBeginResize(event, token) : undefined)}
        onRotatePointerDown={(event) => (interactive ? onBeginRotate(event, token) : undefined)}
        onDeathSaveChange={(type, value) => onDeathSaveChange?.(token, type, value)}
        onContextMenu={(event) => {
          if (!interactive || !onContextMenu) return;
          event.preventDefault();
          event.stopPropagation();
          onContextMenu(token, { x: event.clientX, y: event.clientY });
        }}
      />
    </Box>
  );
});

export default memo(function TokenLayer({
  tokens,
  drag,
  resize,
  rotate,
  view,
  viewportSize,
  grid,
  activeLayer,
  playArea,
  showPlayArea,
  cameraLocked,
  paintMode,
  canMove,
  selectedMapObjectId,
  canSetDeathSaves,
  conditionEntries,
  onBeginDrag,
  onBeginResize,
  onBeginRotate,
  onDeathSaveChange,
  onContextMenu,
}) {
  return (tokens || []).map((token) => {
    const moved = drag?.id === token.id ? { ...token, x: drag.x, y: drag.y } : token;
    const sized = resize?.id === token.id ? { ...moved, w: resize.w, h: resize.h } : moved;
    const live = rotate?.id === token.id ? { ...sized, rotation: rotate.rotation } : sized;
    const rect = tokenWorldRect(live, grid);
    const at = worldToScreen(rect, view);
    if (outsideViewport(rect, at, view.zoom, viewportSize)) return null;

    const onActiveLayer = !activeLayer || token.layer === activeLayer;
    const interactive = !cameraLocked && onActiveLayer && paintMode === 'select';
    const movable = interactive && canMove(token);
    const selected = selectedMapObjectId === token.id;
    return (
      <TokenNode
        key={token.id}
        token={live}
        view={view}
        grid={grid}
        activeLayer={activeLayer}
        playArea={playArea}
        showPlayArea={showPlayArea}
        interactive={interactive}
        movable={movable}
        resizable={movable && selected}
        rotatable={movable && selected}
        canSetDeathSaves={Boolean(interactive && canSetDeathSaves?.(token))}
        conditionEntries={conditionEntries}
        onBeginDrag={onBeginDrag}
        onBeginResize={onBeginResize}
        onBeginRotate={onBeginRotate}
        onDeathSaveChange={onDeathSaveChange}
        onContextMenu={onContextMenu}
      />
    );
  });
});
