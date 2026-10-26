// The supported manuals and adventures, each pointing at its 5etools page:
// the books are read there, the compendium is for looking things up.

import { getJson } from '../encounterbuilder/bestiary/bestiary.js';
import { CORE_2024_SOURCE_PRIORITY } from '../../shared/content/sourcePriority.js';

// The player manuals, plus the 2024 Monster Manual.
export const BOOK_IDS = Object.freeze([...new Set([...CORE_2024_SOURCE_PRIORITY, 'XMM'])]);

export function bookUrl(book) {
  const page = book.kind === 'adventure' ? 'adventure' : 'book';
  return `https://5e.tools/${page}.html#${String(book.id).toLowerCase()}`;
}

export function toBookList(booksJson, adventuresJson) {
  const pick = (list, kind) => (Array.isArray(list) ? list : [])
    .filter((entry) => BOOK_IDS.includes(entry?.id))
    .map((entry) => {
      const book = { id: entry.id, name: entry.name, kind, published: entry.published || '' };
      return { ...book, url: bookUrl(book) };
    });
  return [...pick(booksJson?.book, 'book'), ...pick(adventuresJson?.adventure, 'adventure')]
    .sort((a, b) => a.published.localeCompare(b.published) || a.name.localeCompare(b.name));
}

export async function loadBookList() {
  const [books, adventures] = await Promise.all([
    getJson('books.json'),
    getJson('adventures.json').catch(() => ({ adventure: [] })),
  ]);
  return toBookList(books, adventures);
}
