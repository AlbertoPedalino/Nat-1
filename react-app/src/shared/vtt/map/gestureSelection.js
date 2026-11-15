// Keep native selection from spreading across the page during a gesture.
// Each caller owns its guard, so releasing one finger/viewport cannot remove
// protection still held by another gesture. No selection starts anywhere
// while it is held (selectstart refused); `restyle` also makes the whole page
// unselectable in CSS, for a gesture that drags across it (a map's). That
// stylesheet restyles every element of the page as it comes and goes, so a
// press that stays put (a roller's) goes without it: on a phone it made every
// tap on a roller hitch.
export function suppressGestureSelection({ touch = false, restyle = true } = {}) {
  const style = restyle ? document.createElement('style') : null;
  if (style) {
    style.textContent = `
    :root, :root * {
      -webkit-user-select: none !important;
      user-select: none !important;
      -webkit-touch-callout: none !important;
    }
  `;
    document.head.appendChild(style);
  }
  const prevent = (event) => event.preventDefault();
  document.addEventListener('selectstart', prevent, true);
  if (touch) document.addEventListener('contextmenu', prevent, true);

  return () => {
    style?.remove();
    document.removeEventListener('selectstart', prevent, true);
    document.removeEventListener('contextmenu', prevent, true);
  };
}
