import test from 'node:test';
import assert from 'node:assert/strict';
import { picksFromUnusedBooks } from '../../../../../src/pages/charbuilder/progression/bookPicks.js';

test('picks from a book no longer used are listed, not removed', () => {
  const C = {
    books: [], className: 'Death Knight', classSource: 'WoW', speciesName: 'Dwarf', speciesSource: 'XPHB',
    allFeatSnapshots: [{ name: 'Arathi Heritage', source: 'WoW' }],
  };
  assert.deepEqual(picksFromUnusedBooks(C), ['Death Knight (WoW)', 'Arathi Heritage (WoW)']);
  assert.deepEqual(picksFromUnusedBooks({ ...C, books: ['WoW'] }), []);
});
