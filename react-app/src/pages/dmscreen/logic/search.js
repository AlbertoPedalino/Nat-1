// Filtering the board is a lookup during play, so the search is forgiving:
// case-insensitive, and every whitespace-separated word has to appear somewhere
// in the note — title or body, in any order. Two words therefore narrow the
// board instead of widening it.

export function queryTokens(query) {
  return String(query || '').trim().toLowerCase().split(/\s+/).filter(Boolean);
}

export function noteMatchesTokens(note, tokens) {
  if (tokens.length === 0) return true;
  const haystack = `${note?.title || ''}\n${note?.body || ''}`.toLowerCase();
  return tokens.every((token) => haystack.includes(token));
}

// Returns the same array when nothing is filtered out, so callers can tell an
// inactive search from one that happens to match everything.
export function filterNotes(notes, query) {
  const tokens = queryTokens(query);
  if (tokens.length === 0) return notes;
  const matches = notes.filter((note) => noteMatchesTokens(note, tokens));
  return matches.length === notes.length ? notes : matches;
}
