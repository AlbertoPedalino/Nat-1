import {
  cellSize,
  cellToWorld,
  tokenWorldRect,
  worldToScreen,
} from '../../../shared/vtt/map/geometry.js';
import { movementLabel } from '../../../shared/vtt/map/measure.js';
import { isMapPiece } from '../../../shared/vtt/map/mapObjects.js';
import {
  axialRound,
  hexToWorld,
  isHexGrid,
} from '../../../shared/vtt/map/hexGeometry.js';

// Pure geometry and cursors of the battle-map viewport: brush radius and
// cursor per tool, the selection marquee, the movement badge of a dragged piece,
// and the screen boxes of the play area and the map picture.

// Inline SVG cursors so the pointer says which tool is in hand. Hotspot at the
// nib for the pencil and at the corner of the block for the eraser, or the mark
// lands where the cursor is not.
const PENCIL_CURSOR = "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23e8c96a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M12 20h9'/><path d='M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z'/></svg>\") 2 22, crosshair";

const ERASER_CURSOR = "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23de675f' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='m7 21-4.3-4.3a1 1 0 0 1 0-1.4L15 3a2 2 0 0 1 3 0l3 3a2 2 0 0 1 0 3L10.5 19.5'/><path d='M22 21H7'/></svg>\") 3 21, crosshair";

// The map's mile scale, or nothing at all when it is being read in feet. The
// scene keeps both numbers so switching back and forth loses neither, and this
// is the one place that decides which of them the ruler is speaking.
export function overlandMiles(grid) {
  return grid?.measureUnit === 'miles' ? grid.milesPerCell : 0;
}

// On-screen radius of what the tool will affect, in the same units the tool
// itself uses: fog brushes are measured in squares, ink in tenths of one, and
// the eraser reaches half a square around the pointer.
export function brushRadiusFor(paintMode, { brushSize, drawWidth, cell, fogScale }) {
  // Painting clamps to one fog cell, which can be smaller than a grid square.
  if (paintMode === 'reveal' || paintMode === 'hide') return (Math.max(1, brushSize * fogScale) / fogScale * cell) / 2;
  if (paintMode === 'draw') return Math.max(2, ((drawWidth || 3) / 10) * cell) / 2;
  if (paintMode === 'erase') return (0.5 + (drawWidth || 3) / 20) * cell;
  return 0;
}

export function cursorFor(paintMode, { picksHex = false } = {}) {
  if (paintMode === 'draw') return PENCIL_CURSOR;
  if (paintMode === 'erase') return ERASER_CURSOR;
  if (paintMode === 'reveal' || paintMode === 'hide') return 'crosshair';
  if (paintMode === 'text') return 'text';
  if (paintMode === 'area') return 'crosshair';
  if (paintMode === 'laser' || paintMode === 'measure') return 'crosshair';
  if (paintMode === 'marquee') return 'crosshair';
  // A click here picks a hex: the hand hides which one, the cross points at it.
  if (picksHex) return 'crosshair';
  return 'grab';
}

export function screenSelectionRect(from, to) {
  const left = Math.min(from.x, to.x);
  const top = Math.min(from.y, to.y);
  return {
    left,
    top,
    width: Math.abs(to.x - from.x),
    height: Math.abs(to.y - from.y),
  };
}

export function overlapsSelection(rect, selection) {
  return rect.left < selection.left + selection.width
    && rect.left + rect.width > selection.left
    && rect.top < selection.top + selection.height
    && rect.top + rect.height > selection.top;
}

// How far the piece under the pointer has travelled, and where to show it.
// Measured against the square it will land on, so the number matches what the
// drop will actually cost.
export function measurementBadge(tokens, drag, grid, view, feetPerCell) {
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

// Where the play area sits on screen, in viewport pixels.
export function playAreaBox(scene, view) {
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
export function hexPlayAreaPolygon(scene, view) {
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
export function imageBox(imageSize, view) {
  const topLeft = worldToScreen({ x: 0, y: 0 }, view);
  return {
    left: topLeft.x,
    top: topLeft.y,
    width: imageSize.width * view.zoom,
    height: imageSize.height * view.zoom,
  };
}

export function pointInBox(point, box) {
  return point.x >= box.left
    && point.y >= box.top
    && point.x < box.left + box.width
    && point.y < box.top + box.height;
}
