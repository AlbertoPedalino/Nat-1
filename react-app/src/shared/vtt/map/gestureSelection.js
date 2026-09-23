// Keep native selection from spreading across the page during a map gesture.
// Each caller owns its guard, so releasing one finger/viewport cannot remove
// protection still held by another gesture.
export function suppressGestureSelection({ touch = false } = {}) {
  const style = document.createElement('style');
  style.textContent = `
    :root, :root * {
      -webkit-user-select: none !important;
      user-select: none !important;
      -webkit-touch-callout: none !important;
    }
  `;
  document.head.appendChild(style);
  const prevent = (event) => event.preventDefault();
  document.addEventListener('selectstart', prevent, true);
  if (touch) document.addEventListener('contextmenu', prevent, true);

  return () => {
    style.remove();
    document.removeEventListener('selectstart', prevent, true);
    document.removeEventListener('contextmenu', prevent, true);
  };
}
