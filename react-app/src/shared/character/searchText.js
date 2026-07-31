import { useMemo, useState } from 'react';

// App-wide text-search utilities, shared by the builder selection panels and the
// character-sheet panels. Pure helpers + one wiring hook; the visual field lives
// in SearchField.jsx and the builder-styled wrapper in SelectionSearch.jsx.

// Threshold above which a selection panel is worth a search field.
export const SEARCH_MIN_OPTIONS = 6;

// Normalize for forgiving matching: lowercase, strip accents + punctuation,
// collapse whitespace. Keeps search behaviour consistent across the app.
export function normalizeSearchText(value) {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const defaultGetText = (option) => option?.label;

// Filter options by query. `getText` maps an option to its searchable text
// (a string or array of strings); every query term must match.
export function filterOptions(options, query, getText = defaultGetText) {
  const q = normalizeSearchText(query);
  if (!q) return options;
  const terms = q.split(' ');
  return options.filter((option) => {
    const raw = getText(option);
    const haystack = normalizeSearchText(Array.isArray(raw) ? raw.join(' ') : raw);
    return terms.every((term) => haystack.includes(term));
  });
}

// Wiring shared by every selection panel: holds the query, derives the filtered
// list, and decides whether the search field is worth showing. Call it
// unconditionally (rules of hooks) and render the field when showSearch.
export function useOptionSearch(options, { getText = defaultGetText, minOptions = SEARCH_MIN_OPTIONS } = {}) {
  const [query, setQuery] = useState('');
  const showSearch = options.length >= minOptions;
  const visibleOptions = useMemo(
    () => (showSearch ? filterOptions(options, query, getText) : options),
    [showSearch, options, query, getText],
  );
  return { query, setQuery, showSearch, visibleOptions };
}
