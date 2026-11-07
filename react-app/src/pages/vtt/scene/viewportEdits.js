// In the GM's player preview the board is read-only: the viewport gets the
// same props, each editing one blocked. Most become undefined (no handler);
// these keep a value the viewport reads as "nothing".
const BLOCKED = {
  canMove: () => false,
  selectedHex: null,
  hexBubble: null,
  canSetDeathSaves: () => false,
  placementDrag: null,
  movableDrawing: null,
  selectedDrawingId: null,
  rolls: null,
  controls: null,
  fullscreenSheet: null,
};

export function viewportEdits(preview, live) {
  if (!preview) return live;
  return Object.fromEntries(Object.keys(live).map((key) => [key, Object.hasOwn(BLOCKED, key) ? BLOCKED[key] : undefined]));
}
