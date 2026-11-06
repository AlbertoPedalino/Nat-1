import { useState } from 'react';
import { getStorageJson, setStorageJson } from '../../../shared/storage/storage.js';

// Which of the scene panel's sections are open. A per-browser convenience: a
// GM who calibrates once and then lives in the weather should not reopen it
// every time. A blocked storage only forgets.
const SECTIONS_KEY = 'gb:vtt-scene-sections';

const DEFAULT_SECTIONS = Object.freeze(['pictures']);

function readOpenSections() {
  const stored = getStorageJson(SECTIONS_KEY);
  return Array.isArray(stored) ? stored : DEFAULT_SECTIONS;
}

export function useOpenSections() {
  const [open, setOpen] = useState(readOpenSections);
  const toggle = (id) => {
    const next = open.includes(id) ? open.filter((entry) => entry !== id) : [...open, id];
    setOpen(next);
    setStorageJson(SECTIONS_KEY, next);
  };
  return [open, toggle];
}
