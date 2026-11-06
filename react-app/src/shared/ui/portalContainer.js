// Where a dialog, menu or tooltip is mounted.
//
// MUI portals overlays to `document.body` by default. When an element is
// fullscreen the browser paints only that element and its descendants, so an
// overlay attached to the body is not hidden by CSS: it is not rendered at all.
// The theme makes this the default container of every Modal, Popover and
// Popper; a raw <Portal> passes it itself.
export function activePortalContainer() {
  if (typeof document === 'undefined') return null;
  return document.fullscreenElement || document.webkitFullscreenElement || document.body;
}
