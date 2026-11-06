// How dates and times are written everywhere in the app (en-US, like the rest
// of the interface). Anything that is not a readable date gives ''.

function toDate(value) {
  if (value == null || value === '') return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

// A saved or updated moment: 11/06/26, 03:15 PM.
export function formatDateTime(value) {
  const date = toDate(value);
  return date ? date.toLocaleString('en-US', {
    month: '2-digit', day: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit',
  }) : '';
}

// A time of day to the second, for logs: 03:15:42 PM.
export function formatClockTime(value) {
  const date = toDate(value);
  return date ? date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '';
}
