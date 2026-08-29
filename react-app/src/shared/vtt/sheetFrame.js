// Where a player has put the floating sheet over the map, and how big they made
// it. Session state, never a row: this is one person's window on one screen, not
// something the table shares or the campaign remembers.
//
// The panel is dragged and resized by writing inline styles, so closing it
// unmounts the element and the geometry goes with it. Keeping the numbers here
// is what makes reopening it land where it was left.
//
// Position and size are recorded separately on purpose. Moving a window is not
// a statement about how big it should be, and the default size is responsive
// (`min(620px, calc(100% - 24px))`). Persisting a measured width after a plain
// drag would quietly replace that with a fixed pixel count, so a frame carries
// a size only once the player has actually resized one.

// Small enough to still be a sheet, and the floor the resize handle, the CSS
// and the restore all share.
export const MIN_SHEET_WIDTH = 340;
export const MIN_SHEET_HEIGHT = 260;
// How much of the panel has to stay on the map. Dragging it almost entirely off
// one side is deliberate — the map is underneath — but the title bar has to stay
// catchable, or there is no way to drag it back.
export const SHEET_VISIBLE_GRIP = 96;
export const SHEET_VISIBLE_HEADER = 40;
// The panel never fills the container completely: the rail and the switches live
// under it, and a sheet edge-to-edge reads as a page rather than a window.
export const MAX_SHEET_WIDTH_RATIO = 0.94;
export const MAX_SHEET_HEIGHT_RATIO = 0.92;

function clamp(value, lower, upper) {
  // An upper below the lower would otherwise invert the range and return the
  // smaller of the two, which on a tiny container is a negative size.
  return Math.max(lower, Math.min(Math.max(lower, upper), value));
}

// Strict on purpose. `Number(null)` and `Number([])` are both 0, so coercing
// here would read a truncated entry as a deliberate placement in the corner
// rather than as the corrupt data it is.
function coordinate(value) {
  return typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : null;
}

function extent(value) {
  const number = coordinate(value);
  return number !== null && number > 0 ? number : null;
}

export function normalizeSheetFrame(value) {
  let source = value;
  if (typeof source === 'string') {
    try {
      source = JSON.parse(source);
    } catch (_) {
      return null;
    }
  }
  if (!source || typeof source !== 'object') return null;
  const left = coordinate(source.left);
  const top = coordinate(source.top);
  if (left === null || top === null) return null;
  const width = extent(source.width);
  const height = extent(source.height);
  // Half a size is no size: one axis pinned and the other responsive is a shape
  // nobody asked for.
  const sized = width !== null && height !== null;
  return {
    left, top, width: sized ? width : null, height: sized ? height : null,
  };
}

// Fitting a frame to the container it is about to be shown in. A sheet placed
// on a wide monitor and reopened on a laptop, or left open while the window was
// dragged smaller, would otherwise sit off-screen or overflow the map.
//
// `rendered` is the size the panel currently occupies, which is what the left
// edge has to be measured against when the frame itself carries no size.
export function clampSheetFrame(frame, bounds, rendered = null) {
  const normalized = normalizeSheetFrame(frame);
  if (!normalized) return null;
  const boxWidth = Number(bounds?.width);
  const boxHeight = Number(bounds?.height);
  // An unmeasured container cannot fit anything: the caller waits rather than
  // clamping against zero and pinning the panel to the corner.
  if (!Number.isFinite(boxWidth) || !Number.isFinite(boxHeight) || boxWidth <= 0 || boxHeight <= 0) {
    return null;
  }

  const maxWidth = Math.max(MIN_SHEET_WIDTH, boxWidth * MAX_SHEET_WIDTH_RATIO);
  const maxHeight = Math.max(MIN_SHEET_HEIGHT, boxHeight * MAX_SHEET_HEIGHT_RATIO);
  const width = normalized.width === null
    ? null
    : Math.round(clamp(normalized.width, MIN_SHEET_WIDTH, maxWidth));
  const height = normalized.height === null
    ? null
    : Math.round(clamp(normalized.height, MIN_SHEET_HEIGHT, maxHeight));

  // Measured against the width the panel ends up with, not the one it was
  // remembered at: a panel that had to shrink would otherwise keep an offset
  // belonging to its old size and sit further off the edge than the grip allows.
  const effectiveWidth = width ?? extent(rendered?.width) ?? MIN_SHEET_WIDTH;

  return {
    width,
    height,
    left: Math.round(clamp(
      normalized.left,
      -effectiveWidth + SHEET_VISIBLE_GRIP,
      boxWidth - SHEET_VISIBLE_GRIP,
    )),
    top: Math.round(clamp(normalized.top, 0, boxHeight - SHEET_VISIBLE_HEADER)),
  };
}

export function readSheetFrame(storage, key) {
  try {
    return normalizeSheetFrame(storage?.getItem(key));
  } catch (_) {
    // A blocked or full storage costs the player their window position, which
    // is not a reason to stop them opening the sheet.
    return null;
  }
}

export function writeSheetFrame(storage, key, frame) {
  const normalized = normalizeSheetFrame(frame);
  if (!normalized) return null;
  try {
    storage?.setItem(key, JSON.stringify(normalized));
  } catch (_) {}
  return normalized;
}
