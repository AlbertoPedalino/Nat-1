import { memo, useMemo } from 'react';
import { Box } from '@mui/material';
import { cellSize, tokenWorldRect, worldToScreen } from '../../../shared/vtt/geometry.js';
import { decodeCells } from '../../../shared/vtt/fog.js';
import { isTokenInPlay } from '../../../shared/vtt/scene.js';
import { VTT_COLORS, vttAlpha } from '../../../shared/vtt/colors.js';
import TokenSprite from './TokenSprite.jsx';

const VIEWPORT_OVERSCAN = 180;

function touchesRevealedFog(rect, grid, fog, fogBytes) {
  if (!fog) return true;
  const size = cellSize(grid) / Math.max(1, fog.scale || 1);
  const offsetX = Number(grid?.offsetX) || 0;
  const offsetY = Number(grid?.offsetY) || 0;
  const firstCol = Math.floor((rect.x - offsetX) / size);
  const firstRow = Math.floor((rect.y - offsetY) / size);
  const lastCol = Math.ceil((rect.x + rect.width - offsetX) / size) - 1;
  const lastRow = Math.ceil((rect.y + rect.height - offsetY) / size) - 1;

  for (let row = firstRow; row <= lastRow; row += 1) {
    if (row < 0 || row >= fog.rows) continue;
    for (let col = firstCol; col <= lastCol; col += 1) {
      if (col < 0 || col >= fog.cols) continue;
      const index = row * fog.cols + col;
      if (fogBytes[index >> 3] & (1 << (index & 7))) return true;
    }
  }
  return false;
}

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
  presentedInspection,
  onInspectionChange,
  onBeginDrag,
  onBeginResize,
  onBeginRotate,
  onDeathSaveChange,
  onContextMenu,
  selected = false,
}) {
  const rect = tokenWorldRect(token, grid);
  const at = worldToScreen(rect, view);
  const onActiveLayer = !activeLayer || token.layer === activeLayer;
  const staged = showPlayArea && !isTokenInPlay(token, playArea);

  return (
    <Box
      data-token-selected={selected ? 'true' : undefined}
      sx={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: rect.width * view.zoom,
        height: rect.height * view.zoom,
        transform: `translate(${at.x}px, ${at.y}px)`,
        outline: selected ? `2px solid ${VTT_COLORS.gold}` : 'none',
        outlineOffset: 3,
        boxShadow: selected ? `0 0 0 2px ${vttAlpha(VTT_COLORS.black, 0.72)}` : 'none',
        zIndex: selected ? 2 : undefined,
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
        presentedInspection={presentedInspection}
        onInspectionChange={onInspectionChange}
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
  selectedTokenIds = [],
  canSetDeathSaves,
  conditionEntries,
  fog,
  hideCovered = false,
  presentedInspection,
  onInspectionChange,
  onBeginDrag,
  onBeginResize,
  onBeginRotate,
  onDeathSaveChange,
  onContextMenu,
  groupDrag,
}) {
  const fogBytes = useMemo(() => (
    hideCovered && fog
      ? decodeCells(fog.cells, Math.ceil((fog.cols * fog.rows) / 8))
      : null
  ), [fog, hideCovered]);

  return (tokens || []).map((token) => {
    const groupPosition = groupDrag?.[token.id];
    const moved = groupPosition
      ? { ...token, x: groupPosition.x, y: groupPosition.y }
      : drag?.id === token.id ? { ...token, x: drag.x, y: drag.y } : token;
    const sized = resize?.id === token.id ? { ...moved, w: resize.w, h: resize.h } : moved;
    const live = rotate?.id === token.id ? { ...sized, rotation: rotate.rotation } : sized;
    const rect = tokenWorldRect(live, grid);
    const at = worldToScreen(rect, view);
    if (outsideViewport(rect, at, view.zoom, viewportSize)) return null;
    if (hideCovered && fogBytes && !touchesRevealedFog(rect, grid, fog, fogBytes)) return null;

    const onActiveLayer = !activeLayer || token.layer === activeLayer;
    const interactive = !cameraLocked && onActiveLayer && ['select', 'marquee'].includes(paintMode);
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
        presentedInspection={presentedInspection}
        onInspectionChange={onInspectionChange}
        onBeginDrag={onBeginDrag}
        onBeginResize={onBeginResize}
        onBeginRotate={onBeginRotate}
        onDeathSaveChange={onDeathSaveChange}
        onContextMenu={onContextMenu}
        selected={selectedTokenIds.includes(token.id)}
      />
    );
  });
});
