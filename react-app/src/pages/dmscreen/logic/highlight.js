// Splits text into plain and matching runs so the board can mark what the
// search found. Pure and DOM-free: both the plain title and the rendered
// markdown body go through this, which is why they highlight identically.

export function splitHighlights(text, tokens) {
  const source = String(text ?? '');
  const needles = (tokens || []).filter(Boolean).map((token) => token.toLowerCase());
  if (!source) return [];
  if (needles.length === 0) return [{ text: source, match: false }];

  const haystack = source.toLowerCase();
  const segments = [];
  let cursor = 0;

  while (cursor < source.length) {
    // Earliest match wins, and the longest one at that spot, so a search for
    // "orc orcish" marks the whole word rather than leaving a stray tail.
    let start = -1;
    let length = 0;
    needles.forEach((needle) => {
      const at = haystack.indexOf(needle, cursor);
      if (at < 0) return;
      if (start < 0 || at < start || (at === start && needle.length > length)) {
        start = at;
        length = needle.length;
      }
    });

    if (start < 0) break;
    if (start > cursor) segments.push({ text: source.slice(cursor, start), match: false });
    segments.push({ text: source.slice(start, start + length), match: true });
    cursor = start + length;
  }

  if (cursor < source.length) segments.push({ text: source.slice(cursor), match: false });
  return segments;
}

export function hasHighlight(text, tokens) {
  return splitHighlights(text, tokens).some((segment) => segment.match);
}
