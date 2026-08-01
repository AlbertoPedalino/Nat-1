// A live region is only spoken when its text actually changes, so moving two
// notes into the same position in a row would stay silent. The repeat marker is
// a zero-width space: screen readers ignore it, but toggling it makes the DOM
// text differ from the previous message. It is written as an escape on purpose —
// a literal one is invisible to whoever reads this file next.
const REPEAT_MARKER = String.fromCharCode(0x200B);

export function nextAnnouncement(previous, message) {
  if (!message) return '';
  const said = String(previous || '');
  if (said.replace(REPEAT_MARKER, '') !== message) return message;
  return said.endsWith(REPEAT_MARKER) ? message : message + REPEAT_MARKER;
}
