// Coordinate math for the scene viewport. Pure on purpose: this is where the
// off-by-one bugs live, and a React component is a terrible place to debug them.
//
// Three spaces are in play:
//   screen — pixels inside the viewport element, what pointer events report
//   world  — pixels on the map image, independent of pan and zoom
//   cell   — grid squares, what token x/y/w/h are stored in
//
// Tokens are stored in CELL units so that recalibrating the grid keeps a piece
// on the same square instead of drifting by whatever the pixel offset changed.

import {
  axialRound, hexToWorld, hexWidth, isHexGrid, worldToAxial,
} from './hexGeometry.js';

export const ZOOM_MIN = 0.15;
export const ZOOM_MAX = 6;
export const DEFAULT_VIEW = Object.freeze({ x: 0, y: 0, zoom: 1 });

function numberOr(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function clampZoom(zoom) {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, numberOr(zoom, 1)));
}

export function normalizeView(view) {
  return {
    x: numberOr(view?.x, 0),
    y: numberOr(view?.y, 0),
    zoom: clampZoom(view?.zoom),
  };
}

export function worldToScreen(point, view) {
  const { x, y, zoom } = normalizeView(view);
  return {
    x: numberOr(point?.x, 0) * zoom + x,
    y: numberOr(point?.y, 0) * zoom + y,
  };
}

export function screenToWorld(point, view) {
  const { x, y, zoom } = normalizeView(view);
  return {
    x: (numberOr(point?.x, 0) - x) / zoom,
    y: (numberOr(point?.y, 0) - y) / zoom,
  };
}

export function panBy(view, dx, dy) {
  const next = normalizeView(view);
  return { ...next, x: next.x + numberOr(dx, 0), y: next.y + numberOr(dy, 0) };
}

// Zoom around a fixed screen point (the cursor, or the viewport centre) so the
// map does not slide away from under it.
export function zoomAt(view, factor, screenPoint) {
  const current = normalizeView(view);
  const zoom = clampZoom(current.zoom * numberOr(factor, 1));
  const anchor = {
    x: numberOr(screenPoint?.x, 0),
    y: numberOr(screenPoint?.y, 0),
  };
  const world = screenToWorld(anchor, current);
  return {
    zoom,
    x: anchor.x - world.x * zoom,
    y: anchor.y - world.y * zoom,
  };
}

export function cellSize(grid) {
  return Math.max(1, numberOr(grid?.size, 70));
}

// Grid lines start at the offset, so cell (0,0) begins there — not at the image
// corner. A negative world coordinate therefore lands on a negative cell index,
// which callers clamp if they care.
export function worldToCell(point, grid) {
  const size = cellSize(grid);
  const offsetX = numberOr(grid?.offsetX, 0);
  const offsetY = numberOr(grid?.offsetY, 0);
  return {
    col: Math.floor((numberOr(point?.x, 0) - offsetX) / size),
    row: Math.floor((numberOr(point?.y, 0) - offsetY) / size),
  };
}

export function cellToWorld(cell, grid) {
  const size = cellSize(grid);
  return {
    x: numberOr(cell?.col, 0) * size + numberOr(grid?.offsetX, 0),
    y: numberOr(cell?.row, 0) * size + numberOr(grid?.offsetY, 0),
  };
}

// A token's on-screen box. Position and span are both in cells, so this is the
// single place that multiplies by the cell size.
export function tokenWorldRect(token, grid) {
  const w = Math.max(0.1, numberOr(token?.w, 1));
  const h = Math.max(0.1, numberOr(token?.h, 1));
  // On hexes x/y are axial q/r and they name the hex a piece stands ON, so the
  // box is centred rather than hung off a corner: a square grid has a corner to
  // hang it from, a hex does not.
  if (isHexGrid(grid)) {
    const width = hexWidth(grid);
    const centre = hexToWorld({ q: numberOr(token?.x, 0), r: numberOr(token?.y, 0) }, grid);
    return {
      x: centre.x - (width * w) / 2,
      y: centre.y - (width * h) / 2,
      width: width * w,
      height: width * h,
    };
  }
  const size = cellSize(grid);
  const origin = cellToWorld({ col: numberOr(token?.x, 0), row: numberOr(token?.y, 0) }, grid);
  return {
    x: origin.x,
    y: origin.y,
    width: w * size,
    height: h * size,
  };
}

// Snap a dragged token to whole cells. An even span sits on the intersection, an
// odd one on a square centre — which is what keeps a 1x1 piece centred in its
// square and a 2x2 piece straddling four.
export function snapCell(x, y, { snap = true } = {}) {
  if (!snap) return { x: numberOr(x, 0), y: numberOr(y, 0) };
  return { x: Math.round(numberOr(x, 0)), y: Math.round(numberOr(y, 0)) };
}

// Where a token should land when dropped: the pointer holds the same spot on the
// piece it was grabbed by, then the result snaps.
export function dropPosition({
  pointerWorld, grabOffset, grid, snap = true, span = null,
}) {
  const worldX = numberOr(pointerWorld?.x, 0) - numberOr(grabOffset?.x, 0);
  const worldY = numberOr(pointerWorld?.y, 0) - numberOr(grabOffset?.y, 0);

  // A hex piece is placed by its centre, so the box has to be walked back to one
  // before the world point means anything. `span` is what the piece covers, in
  // cells; without it a piece wider than one hex lands a hex or two off.
  if (isHexGrid(grid)) {
    const width = hexWidth(grid);
    const centre = {
      x: worldX + (width * Math.max(0.1, numberOr(span?.w, 1))) / 2,
      y: worldY + (width * Math.max(0.1, numberOr(span?.h, 1))) / 2,
    };
    const axial = worldToAxial(centre, grid);
    const cell = snap ? axialRound(axial) : axial;
    return { x: cell.q, y: cell.r };
  }

  const size = cellSize(grid);
  const offsetX = numberOr(grid?.offsetX, 0);
  const offsetY = numberOr(grid?.offsetY, 0);
  return snapCell((worldX - offsetX) / size, (worldY - offsetY) / size, { snap });
}

// Topmost token under a point, so a piece stacked on another gets picked first.
export function tokenAtPoint(tokens, worldPoint, grid) {
  const point = { x: numberOr(worldPoint?.x, 0), y: numberOr(worldPoint?.y, 0) };
  let found = null;
  for (const token of tokens || []) {
    const rect = tokenWorldRect(token, grid);
    const hit = point.x >= rect.x
      && point.x <= rect.x + rect.width
      && point.y >= rect.y
      && point.y <= rect.y + rect.height;
    if (!hit) continue;
    if (!found || numberOr(token.z, 0) >= numberOr(found.z, 0)) found = token;
  }
  return found;
}

// Fit an image inside the viewport with a little breathing room.
export function fitView({ imageWidth, imageHeight, viewportWidth, viewportHeight, padding = 24 }) {
  const iw = Math.max(1, numberOr(imageWidth, 1));
  const ih = Math.max(1, numberOr(imageHeight, 1));
  const vw = Math.max(1, numberOr(viewportWidth, 1));
  const vh = Math.max(1, numberOr(viewportHeight, 1));
  const zoom = clampZoom(Math.min((vw - padding * 2) / iw, (vh - padding * 2) / ih));
  return {
    zoom,
    x: (vw - iw * zoom) / 2,
    y: (vh - ih * zoom) / 2,
  };
}

// Fill the viewport edge to edge. Unlike fitView this deliberately crops the
// longer axis, which is the right framing for an establishing-shot background.
export function fillView({ imageWidth, imageHeight, viewportWidth, viewportHeight }) {
  const iw = Math.max(1, numberOr(imageWidth, 1));
  const ih = Math.max(1, numberOr(imageHeight, 1));
  const vw = Math.max(1, numberOr(viewportWidth, 1));
  const vh = Math.max(1, numberOr(viewportHeight, 1));
  const zoom = clampZoom(Math.max(vw / iw, vh / ih));
  return {
    zoom,
    x: (vw - iw * zoom) / 2,
    y: (vh - ih * zoom) / 2,
  };
}
