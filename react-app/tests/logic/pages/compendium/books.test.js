import test from 'node:test';
import assert from 'node:assert/strict';
import { BOOK_IDS, toBookList } from '../../../../src/pages/compendium/books.js';

test('only the supported manuals and adventures are listed, oldest first, each with its 5etools page', () => {
  const list = toBookList(
    { book: [
      { id: 'XDMG', name: "Dungeon Master's Guide (2024)", published: '2024-11-12' },
      { id: 'XPHB', name: "Player's Handbook (2024)", published: '2024-09-17' },
      { id: 'PHB', name: "Player's Handbook (2014)", published: '2014-08-19' },
    ] },
    { adventure: [{ id: 'AUD', name: 'Arcana Unleashed: Deadfall', published: '2026-09-15' }] },
  );
  assert.deepEqual(list.map((book) => [book.id, book.kind, book.url]), [
    ['XPHB', 'book', 'https://5e.tools/book.html#xphb'],
    ['XDMG', 'book', 'https://5e.tools/book.html#xdmg'],
    ['AUD', 'adventure', 'https://5e.tools/adventure.html#aud'],
  ]);
  assert.ok(BOOK_IDS.includes('XMM'));
});
