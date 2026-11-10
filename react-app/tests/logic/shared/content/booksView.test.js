import test from 'node:test';
import assert from 'node:assert/strict';
import { ALWAYS_ON_BOOKS, SELECTABLE_BOOKS, characterBooks, isBookAllowed } from '../../../../src/shared/content/sourcePriority.js';
import { builderDataForBooks, filterByBooks, spellsForBooks } from '../../../../src/shared/content/booksView.js';
import { buildClassSpellBooks, classSpellIndexForBooks } from '../../../../src/shared/content/catalogs/spellData.js';

// A character is built from the core books and the books its player picks.
test('a character without a choice uses every book; core books are always on', () => {
  assert.deepEqual(characterBooks({}), SELECTABLE_BOOKS.slice());
  assert.ok(ALWAYS_ON_BOOKS.every((book) => !SELECTABLE_BOOKS.includes(book)));
  const C = { books: ['EFA'] };
  assert.equal(isBookAllowed(C, 'XPHB'), true);
  assert.equal(isBookAllowed(C, 'XMM'), true);
  assert.equal(isBookAllowed(C, 'EFA'), true);
  assert.equal(isBookAllowed(C, 'WoW'), false);
  assert.equal(isBookAllowed(C, 'Custom'), true);
});

test('turning a book off brings back the other printing of a spell', () => {
  const versions = [
    { name: 'Fireball', source: 'XPHB', level: 3 },
    { name: 'Rune Strike', source: 'WoW', level: 1 },
  ];
  assert.deepEqual(spellsForBooks(versions, { books: [] }).map((s) => s.name), ['Fireball']);
  assert.deepEqual(spellsForBooks(versions, {}).map((s) => s.name), ['Rune Strike', 'Fireball']);
  assert.deepEqual(filterByBooks([{ name: 'Dwarf', source: 'XPHB' }, { name: 'Dwarf', source: 'WoW' }], { books: [] }).map((s) => s.source), ['XPHB']);
});

test('class lists keep the book of each addition', () => {
  const books = buildClassSpellBooks({
    xphb: {
      'core spell': { class: { XPHB: { Druid: true } } },
      'battle familiar': { classVariant: { XPHB: { Druid: { definedInSources: ['AU'] } } } },
      'flame strike': { class: { WoW: { Mage: true } } },
    },
  });
  assert.deepEqual(classSpellIndexForBooks(books, { books: [] }).druid, ['core spell']);
  assert.deepEqual(classSpellIndexForBooks(books, { books: ['AU'] }).druid, ['core spell', 'battle familiar']);
  assert.deepEqual(classSpellIndexForBooks(books, { books: [] }).mage, []);
});

test('the builder sees only the content of the chosen books, once per choice', () => {
  const data = {
    classes: [{ name: 'Paladin', source: 'XPHB' }, { name: 'Death Knight', source: 'WoW' }],
    species: [{ name: 'Dwarf', source: 'XPHB' }, { name: 'Dwarf', source: 'WoW' }],
    feats: [], items: [], spells: [], spellVersions: [], classSpellIndex: {},
  };
  const view = builderDataForBooks(data, { books: ['EFA'] });
  assert.deepEqual(view.classes.map((c) => c.name), ['Paladin']);
  assert.deepEqual(view.species.map((s) => s.source), ['XPHB']);
  assert.equal(builderDataForBooks(data, { books: ['EFA'] }), view);
  assert.equal(builderDataForBooks(data, {}).classes.length, 2);
});
