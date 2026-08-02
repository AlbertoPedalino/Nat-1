// Where a dialog or menu should be mounted.
//
// MUI portals modals to `document.body` by default. When an element is
// fullscreen the browser paints only that element and its descendants, so a
// dialog attached to the body is not hidden by CSS — it is simply not rendered
// at all. Every overlay the map opens has to be mounted inside whatever is
// currently fullscreen instead.
export function fullscreenContainer() {
  return document.fullscreenElement || document.body;
}
