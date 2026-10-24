import test from 'node:test';
import assert from 'node:assert/strict';
import { BOOK_IDS, bookChapters, searchBook, toBookList } from '../../../../src/pages/compendium/books.js';

test('only the supported manuals and adventures are books, oldest first', () => {
  const list = toBookList(
    { book: [
      { id: 'XDMG', name: "Dungeon Master's Guide (2024)", published: '2024-11-12' },
      { id: 'XPHB', name: "Player's Handbook (2024)", published: '2024-09-17' },
      { id: 'PHB', name: "Player's Handbook (2014)", published: '2014-08-19' },
    ] },
    { adventure: [{ id: 'AUD', name: 'Arcana Unleashed: Deadfall', published: '2026-09-15' }] },
  );
  assert.deepEqual(list.map((book) => [book.id, book.kind, book.file]), [
    ['XPHB', 'book', 'book/book-xphb.json'],
    ['XDMG', 'book', 'book/book-xdmg.json'],
    ['AUD', 'adventure', 'adventure/adventure-aud.json'],
  ]);
  assert.ok(BOOK_IDS.includes('XMM'));
});

const data = [
  {
    type: 'section',
    name: 'Chapter 1: Playing the Game',
    entries: [
      'Imagination is a key ingredient.',
      { type: 'image', href: { type: 'internal', path: 'book/XPHB/x.webp' }, title: 'A {@dice d20}', credit: 'An Artist', width: 100, height: 50 },
      { type: 'entries', name: 'Dice', entries: ['The game uses polyhedral dice.', { type: 'entries', name: 'The D20', entries: ['Roll a d20 for tests.'] }] },
      { type: 'entries', name: 'Combat', entries: [{ type: 'table', caption: 'Cover', colLabels: ['Cover', 'AC bonus'], rows: [['Half', '+2']] }] },
    ],
  },
  { type: 'section', name: 'Credits', entries: [{ type: 'entries', name: 'Lead Designers', entries: ['Many people.'] }] },
];

test('chapters split into sections at their top-level headings, pictures included', () => {
  const chapters = bookChapters(data);
  assert.deepEqual(chapters[0].sections.map((section) => section.name), ['Chapter 1: Playing the Game', 'Dice', 'Combat']);
  assert.deepEqual(chapters[0].sections[1].blocks.map((block) => block.text || block.caption), [
    'Dice', 'The game uses polyhedral dice.', 'The D20', 'Roll a d20 for tests.',
  ], 'deeper headings stay inside their section');
  assert.deepEqual(chapters[1].sections.map((section) => section.name), ['Lead Designers'], 'no empty opening section');
  const [, picture] = chapters[0].sections[0].blocks;
  assert.equal(picture.kind, 'image');
  assert.match(picture.src, /5etools-img\/main\/book\/XPHB\/x\.webp$/);
  assert.deepEqual([picture.title, picture.credit, picture.width, picture.height], ['A d20', 'An Artist', 100, 50]);
});

test('a search lands on the block, with where it is and the text around it', () => {
  const chapters = bookChapters(data);
  const hits = searchBook(chapters, 'd20');
  assert.deepEqual(hits.map((hit) => [hit.chapter, hit.section, hit.blockIndex]), [
    ['Chapter 1: Playing the Game', 'Chapter 1: Playing the Game', 1], // a picture's caption
    ['Chapter 1: Playing the Game', 'Dice', 2],
    ['Chapter 1: Playing the Game', 'Dice', 3],
  ]);
  assert.equal(hits[2].snippet, 'Roll a d20 for tests.');
  assert.deepEqual(searchBook(chapters, 'half dice').map((hit) => hit.section), [], 'all words in one block');
  assert.deepEqual(searchBook(chapters, 'half 2').map((hit) => hit.section), ['Combat'], 'tables are searched');
  assert.deepEqual(searchBook(chapters, 'd'), [], 'one letter is not a search');
  assert.equal(searchBook(chapters, 'the', { limit: 2 }).length, 2);
});

test('references become the text they stand for: compendium first, then the kind’s own data', async () => {
  const { bookReferenceNeeds, resolveBookReferences } = await import('../../../../src/pages/compendium/books.js');
  const { buildCompendiumIndex, createCompendiumLookup } = await import('../../../../src/pages/compendium/compendiumIndex.js');
  const lookup = createCompendiumLookup(buildCompendiumIndex({
    spell: [{ name: 'Fireball', source: 'XPHB', level: 3, schoolFull: 'Evocation', castingTimeLabel: 'Action', rangeLabel: '150 feet', descriptionEntries: ['A bright streak.'] }],
    rule: [{ name: 'Falling', source: 'XPHB', entries: ['You take 1d6 per 10 feet.'] }],
    monster: [{ name: 'Dao', source: 'XMM', cr: '11', type: 'elemental', ac: [18], hp: { average: 200 }, action: [{ name: 'Multiattack', entries: ['Three attacks.'] }] }],
  }));
  const book = [{
    type: 'section',
    name: 'Chapter',
    entries: [
      { type: 'statblock', tag: 'spell', name: 'Fireball', source: 'XPHB' },
      { type: 'statblock', tag: 'variantrule', name: 'Falling', source: 'XPHB' },
      { type: 'statblock', tag: 'hazard', name: 'Burning', source: 'XPHB' },
      { type: 'statblock', tag: 'creature', name: 'Dao', source: 'XMM' },
      { type: 'statblock', prop: 'monsterFluff', name: 'Dao', source: 'XMM' },
      { type: 'statblock', prop: 'monsterFluff', name: 'Nobody', source: 'XMM' },
      { type: 'statblock', tag: 'class', name: 'Barbarian', source: 'XPHB' },
    ],
  }];
  const needs = bookReferenceNeeds(book, lookup);
  assert.deepEqual([needs.tags, needs.fluffSources, needs.classNames, needs.creatureSources], [['hazard'], ['xmm'], ['barbarian'], []]);
  const tables = {
    hazard: new Map([['burning|xphb', { name: 'Burning', source: 'XPHB', entries: ['You take 1d4 Fire damage.'] }]]),
    monsterFluff: new Map([['dao|xmm', { name: 'Dao', source: 'XMM', entries: ['Genies of minerals.'] }]]),
  };
  const [chapter] = bookChapters(resolveBookReferences(book, { lookup, tables }));
  const text = chapter.sections.flatMap((section) => section.blocks).map((block) => block.text);
  assert.deepEqual(text, [
    'Fireball', '3rd-level Evocation', 'Casting Time: Action; Range: 150 feet', 'A bright streak.',
    'Falling', 'You take 1d6 per 10 feet.',
    'Burning', 'You take 1d4 Fire damage.',
    // The whole stat block (the ability scores are a table, without text).
    'Dao', 'Elemental', 'Armor Class 18', 'Hit Points 200', 'Speed —', undefined, 'Languages —',
    'Challenge 11 (XP 7,200; PB +4)', 'Actions', 'Multiattack', 'Three attacks.',
    'Genies of minerals.',
    'Barbarian', 'The full class is not shown here.',
  ]);
});

test('classes, subclasses, item groups, vehicles and formula boxes read as the book shows them', async () => {
  const { resolveBookReferences, bookReferenceNeeds } = await import('../../../../src/pages/compendium/books.js');
  const classFile = {
    class: [{
      name: 'Barbarian', source: 'XPHB', hd: { faces: 12 }, primaryAbility: [{ str: true }],
      classFeatures: ['Rage|Barbarian|XPHB|1', { classFeature: 'Barbarian Subclass|Barbarian|XPHB|3', gainSubclassFeature: true }],
      classTableGroups: [{ colLabels: ['Rages'], rows: Array.from({ length: 20 }, (_, i) => [String(2 + Math.floor(i / 5))]) }],
    }],
    classFeature: [
      { name: 'Rage', className: 'Barbarian', classSource: 'XPHB', level: 1, entries: ['You can imbue yourself with a primal power.'] },
      { name: 'Barbarian Subclass', className: 'Barbarian', classSource: 'XPHB', level: 3, entries: ['Choose a subclass.'] },
    ],
    subclass: [{ name: 'Path of the Berserker', shortName: 'Berserker', source: 'XPHB', className: 'Barbarian', classSource: 'XPHB' }],
    subclassFeature: [
      { name: 'Path of the Berserker', className: 'Barbarian', classSource: 'XPHB', subclassShortName: 'Berserker', subclassSource: 'XPHB', level: 3, entries: ['Violent fury.'] },
      { name: 'Frenzy', className: 'Barbarian', classSource: 'XPHB', subclassShortName: 'Berserker', subclassSource: 'XPHB', level: 3, entries: ['Extra damage.'] },
    ],
  };
  const book = [{
    name: 'Chapter 3',
    entries: [
      { type: 'statblock', tag: 'class', name: 'Barbarian', source: 'XPHB' },
      { type: 'statblock', tag: 'item', name: 'Bag of Tricks', source: 'XDMG' },
      { type: 'statblock', tag: 'vehicle', name: 'Skiff', source: 'EFA' },
      { type: 'abilityDc', name: 'Spell', attributes: ['wis'] },
      { type: 'quote', entries: ['Adventure awaits.'], by: 'A sage' },
    ],
  }];
  const needs = bookReferenceNeeds(book);
  assert.deepEqual([needs.classNames, needs.subclassClasses, needs.items, needs.tags], [['barbarian'], [], true, ['vehicle']]);
  const tables = {
    classes: new Map([['barbarian', classFile]]),
    subclassClasses: new Set(),
    itemFallback: new Map([['bag of tricks|xdmg', { name: 'Bag of Tricks', entries: ['{@i Comes as: Gray, Rust.}', 'A small bag.'] }]]),
    vehicle: new Map([['skiff|efa', { name: 'Skiff', capCrew: 2, speed: { fly: { number: 60 } }, hull: { ac: 13, hp: 50 }, weapon: [{ name: 'Ballista', count: 2, ac: 15, entries: ['Shoots bolts.'] }] }]]),
  };
  const [chapter] = bookChapters(resolveBookReferences(book, { tables }));
  const blocks = chapter.sections.flatMap((section) => section.blocks);
  const text = blocks.filter((block) => block.kind !== 'table').map((block) => block.text);
  assert.deepEqual(text, [
    'Barbarian', 'Hit Point Die: d12 per Barbarian level; Primary Ability: Strength',
    'Level 1: Rage', 'You can imbue yourself with a primal power.',
    'Level 3: Barbarian Subclass', 'Choose a subclass.',
    'Path of the Berserker', 'Violent fury.', 'Level 3: Frenzy', 'Extra damage.',
    'Bag of Tricks', 'Comes as: Gray, Rust.', 'A small bag.',
    'Skiff', 'Crew 2', 'Speed: fly 60 ft.', 'AC 13 · HP 50', 'Ballista (2)', 'AC 15', 'Shoots bolts.',
    'Spell save DC', '8 + your Proficiency Bonus + your Wisdom modifier',
    'Adventure awaits.', '— A sage',
  ]);
  const table = blocks.find((block) => block.kind === 'table');
  assert.deepEqual(table.headers, ['Level', 'Proficiency Bonus', 'Class Features', 'Rages']);
  assert.deepEqual(table.rows[0], ['1', '+2', 'Rage', '2']);
  assert.deepEqual(table.rows[4], ['5', '+3', '—', '2']);

  // A book that lists the subclasses itself does not get them twice.
  const [listed] = bookChapters(resolveBookReferences(book.slice(0, 1).map((c) => ({ ...c, entries: c.entries.slice(0, 1) })), {
    tables: { ...tables, subclassClasses: new Set(['barbarian']) },
  }));
  assert.ok(!listed.sections.flatMap((section) => section.blocks).some((block) => block.text === 'Path of the Berserker'));
});

test('sidebars and read-aloud text stay boxes inside their section', () => {
  const [chapter] = bookChapters([{
    name: 'Chapter',
    entries: [
      'Opening.',
      { type: 'insetReadaloud', entries: ['The door creaks open.'] },
      { type: 'inset', name: 'Variant: Flanking', entries: ['A sidebar rule.'] },
      { type: 'entries', name: 'Next Section', entries: ['More.'] },
    ],
  }]);
  assert.deepEqual(chapter.sections.map((section) => section.name), ['Chapter', 'Next Section'], 'a sidebar title is no section');
  assert.deepEqual(chapter.sections[0].blocks.map((block) => block.kind === 'boxStart' ? `[${block.variant}` : block.kind === 'boxEnd' ? ']' : block.text), [
    'Opening.', '[readaloud', 'The door creaks open.', ']', '[inset', 'Variant: Flanking', 'A sidebar rule.', ']',
  ]);
});
