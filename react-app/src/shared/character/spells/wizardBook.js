import { matchKey } from '../../content/nameKeys.js';

// A wizard's spellbook by level, as the builder and the sheet both store it:
// names only, each once (names compared like every other name, by matchKey).
export function normalizeWizardBook(book) {
  const next = {};
  for (let level = 0; level <= 9; level++) {
    const seen = new Set();
    next[level] = [];
    (book?.[level] || []).forEach((entry) => {
      const name = typeof entry === 'string' ? entry : entry?.name;
      const key = matchKey(name);
      if (!key || seen.has(key)) return;
      seen.add(key);
      next[level].push(name);
    });
  }
  return next;
}
