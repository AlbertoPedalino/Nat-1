import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createNote,
  describeNotePosition,
  normalizeNoteSize,
  resolveDropIndex,
} from './notes.js';
import { columnUnitWidth, columnsForWidth, rowSpanForHeight } from './layout.js';
import { dragTranslate, flipOffsets, grabOffsetFor } from './dragMotion.js';
import { nextAnnouncement } from './announce.js';
import { filterNotes, noteMatchesTokens, queryTokens } from './search.js';
import { splitHighlights } from './highlight.js';
import rehypeMarkMatches from './rehypeMarkMatches.js';
import { createInitialState, dmScreenReducer } from '../state/reducer.js';
import * as storage from '../storage.js';

class MemoryStorage {
  constructor() { this.store = new Map(); }
  getItem(key) { return this.store.has(key) ? this.store.get(key) : null; }
  setItem(key, value) { this.store.set(key, String(value)); }
  removeItem(key) { this.store.delete(key); }
  clear() { this.store.clear(); }
  key(index) { return Array.from(this.store.keys())[index] ?? null; }
  get length() { return this.store.size; }
}

if (!globalThis.localStorage) {
  Object.defineProperty(globalThis, 'localStorage', { value: new MemoryStorage(), configurable: true });
}

function reduce(state, action) {
  return dmScreenReducer(state, action);
}

test('reducer adds a note and focuses its stable id', () => {
  const note = createNote('note-a');
  const state = reduce(createInitialState(), { type: 'addNote', note });
  assert.deepEqual(state.notes, [{ id: 'note-a', title: '', body: '', size: { cols: 4, height: 0 } }]);
  assert.equal(state.focusNoteId, 'note-a');
});

test('reducer edits title and body without changing note ids', () => {
  let state = { notes: [createNote('note-a')], focusNoteId: null };
  state = reduce(state, { type: 'updateNote', id: 'note-a', field: 'title', value: 'Rules' });
  state = reduce(state, { type: 'updateNote', id: 'note-a', field: 'body', value: '<b>inert</b>' });
  assert.deepEqual(state.notes, [{ id: 'note-a', title: 'Rules', body: '<b>inert</b>', size: { cols: 4, height: 0 } }]);
});

test('reducer drops a dragged note at the target index instead of swapping', () => {
  const initial = { notes: [createNote('a'), createNote('b'), createNote('c')], focusNoteId: null };
  const toStart = reduce(initial, { type: 'moveNoteTo', id: 'c', index: 0 });
  assert.deepEqual(toStart.notes.map((note) => note.id), ['c', 'a', 'b']);

  const toEnd = reduce(initial, { type: 'moveNoteTo', id: 'a', index: 2 });
  assert.deepEqual(toEnd.notes.map((note) => note.id), ['b', 'c', 'a']);

  assert.equal(reduce(initial, { type: 'moveNoteTo', id: 'a', index: 0 }).notes, initial.notes);
  assert.equal(reduce(initial, { type: 'moveNoteTo', id: 'ghost', index: 1 }).notes, initial.notes);
  assert.deepEqual(
    reduce(initial, { type: 'moveNoteTo', id: 'a', index: 99 }).notes.map((note) => note.id),
    ['b', 'c', 'a'],
  );
});

test('note sizes are clamped and non-numeric values fall back to auto height', () => {
  assert.deepEqual(normalizeNoteSize(undefined), { cols: 4, height: 0 });
  assert.deepEqual(normalizeNoteSize({ cols: 99, height: 5000 }), { cols: 12, height: 1200 });
  assert.deepEqual(normalizeNoteSize({ cols: 0, height: 10 }), { cols: 1, height: 160 });
  assert.deepEqual(normalizeNoteSize({ cols: '5', height: '320' }), { cols: 5, height: 320 });
  assert.deepEqual(normalizeNoteSize({ cols: 'wide', height: 'tall' }), { cols: 4, height: 0 });
});

test('pre-12-column notes migrate their span into column units', () => {
  assert.deepEqual(normalizeNoteSize({ span: 1, height: 0 }), { cols: 4, height: 0 });
  assert.deepEqual(normalizeNoteSize({ span: 2, height: 300 }), { cols: 8, height: 300 });
  assert.deepEqual(normalizeNoteSize({ span: 3 }), { cols: 12, height: 0 });
  // An explicit cols wins: only notes written before the 12-column grid carry span.
  assert.deepEqual(normalizeNoteSize({ cols: 5, span: 3 }), { cols: 5, height: 0 });
});

test('row spans cover the gaps a tall card swallows', () => {
  assert.equal(rowSpanForHeight(0), 1);
  assert.equal(rowSpanForHeight(8), 1);
  assert.equal(rowSpanForHeight(20), 2);
  assert.equal(rowSpanForHeight(300), 16);
});

test('pointer resize snaps a dragged width to whole columns', () => {
  const unit = columnUnitWidth(1200);
  assert.equal(Math.round(unit), 101);
  assert.equal(columnsForWidth(1200, unit), 12);
  assert.equal(columnsForWidth(390, unit), 4);
  assert.equal(columnsForWidth(-50, unit), 1);
  assert.equal(columnsForWidth(9000, unit), 12);
  assert.equal(columnsForWidth(390, 0), 12);
});

test('reducer resizes one note and ignores a no-op resize', () => {
  const initial = { notes: [createNote('a'), createNote('b')], focusNoteId: null };
  const resized = reduce(initial, { type: 'resizeNote', id: 'a', size: { cols: 7, height: 300 } });
  assert.deepEqual(resized.notes[0].size, { cols: 7, height: 300 });
  assert.deepEqual(resized.notes[1].size, { cols: 4, height: 0 });
  assert.equal(reduce(resized, { type: 'resizeNote', id: 'a', size: { cols: 7, height: 300 } }).notes, resized.notes);
});

test('drop index follows the nearest card centre and accounts for the dragged slot', () => {
  const rects = [
    { left: 0, top: 0, width: 100, height: 100 },
    { left: 120, top: 0, width: 100, height: 100 },
    { left: 240, top: 0, width: 100, height: 100 },
  ];
  assert.equal(resolveDropIndex(rects, { x: 10, y: 50 }, 2), 0);
  assert.equal(resolveDropIndex(rects, { x: 300, y: 50 }, 0), 2);
  assert.equal(resolveDropIndex(rects, { x: 130, y: 50 }, 0), 0);
  assert.equal(resolveDropIndex([], { x: 0, y: 0 }, 1), 1);
});

test('the dragged card stays under the pointer after the grid reflows around it', () => {
  const grabOffset = grabOffsetFor({ x: 120, y: 60 }, { left: 100, top: 40 });
  assert.deepEqual(grabOffset, { x: 20, y: 20 });

  // Same slot, pointer moved: the card follows by the pointer delta.
  assert.deepEqual(
    dragTranslate({ x: 200, y: 90 }, grabOffset, { left: 100, top: 40 }),
    { x: 80, y: 30 },
  );
  // Pointer unchanged but the note was reordered into another slot: the
  // translation absorbs the jump instead of the card visibly teleporting.
  assert.deepEqual(
    dragTranslate({ x: 120, y: 60 }, grabOffset, { left: 400, top: 240 }),
    { x: -300, y: -200 },
  );
});

test('FLIP offsets invert the slots the other notes just slid into', () => {
  const previous = new Map([
    ['a', { left: 0, top: 0 }],
    ['b', { left: 200, top: 0 }],
    ['c', { left: 400, top: 0 }],
  ]);
  const next = new Map([
    ['a', { left: 200, top: 40 }],
    ['b', { left: 200, top: 0 }],
    ['c', { left: 0, top: 0 }],
  ]);

  const offsets = flipOffsets(previous, next, 'a');
  // 'a' is the dragged card: its transform belongs to the pointer, not the FLIP.
  assert.equal(offsets.has('a'), false);
  // 'b' never moved, so animating it would only cost a frame.
  assert.equal(offsets.has('b'), false);
  assert.deepEqual(offsets.get('c'), { dx: 400, dy: 0 });
});

test('FLIP ignores cards that appeared or vanished between snapshots', () => {
  const offsets = flipOffsets(
    new Map([['a', { left: 0, top: 0 }]]),
    new Map([['a', { left: 0, top: 100 }], ['new', { left: 300, top: 0 }]]),
    null,
  );
  assert.deepEqual([...offsets.keys()], ['a']);
  assert.deepEqual(offsets.get('a'), { dx: 0, dy: -100 });
});

const SEARCHABLE = [
  { id: 'a', title: 'Tavern NPCs', body: 'Garret the barkeep, **surly**' },
  { id: 'b', title: '', body: 'Loot: 40gp, a silver ring' },
  { id: 'c', title: 'House rules', body: 'Crits: max damage plus a roll' },
];

test('search matches titles and bodies, case-insensitively', () => {
  assert.deepEqual(filterNotes(SEARCHABLE, 'npcs').map((note) => note.id), ['a']);
  assert.deepEqual(filterNotes(SEARCHABLE, 'GARRET').map((note) => note.id), ['a']);
  // An untitled note is still reachable through its body.
  assert.deepEqual(filterNotes(SEARCHABLE, 'silver').map((note) => note.id), ['b']);
  // Markdown is searched as written, which is what the GM typed.
  assert.deepEqual(filterNotes(SEARCHABLE, '**surly**').map((note) => note.id), ['a']);
});

test('every search word has to appear, in either field and in any order', () => {
  assert.deepEqual(filterNotes(SEARCHABLE, 'crits roll').map((note) => note.id), ['c']);
  assert.deepEqual(filterNotes(SEARCHABLE, 'roll crits').map((note) => note.id), ['c']);
  // 'tavern' is a title word and 'barkeep' a body word: both count.
  assert.deepEqual(filterNotes(SEARCHABLE, 'tavern barkeep').map((note) => note.id), ['a']);
  assert.deepEqual(filterNotes(SEARCHABLE, 'crits silver'), []);
});

test('an inactive or all-matching search hands back the very same array', () => {
  // The board relies on this identity to know whether the view is partial, and
  // therefore whether reordering still lines up with the stored order.
  assert.equal(filterNotes(SEARCHABLE, ''), SEARCHABLE);
  assert.equal(filterNotes(SEARCHABLE, '   '), SEARCHABLE);
  assert.equal(filterNotes(SEARCHABLE, 'a'), SEARCHABLE);
  assert.notEqual(filterNotes(SEARCHABLE, 'loot'), SEARCHABLE);

  assert.deepEqual(queryTokens('  Tavern   NPCs '), ['tavern', 'npcs']);
  assert.equal(noteMatchesTokens({ title: 'x' }, []), true);
  assert.equal(noteMatchesTokens({}, ['x']), false);
});

test('highlight splits text into plain and matching runs', () => {
  assert.deepEqual(splitHighlights('Tavern NPCs', ['npc']), [
    { text: 'Tavern ', match: false },
    { text: 'NPC', match: true },
    { text: 's', match: false },
  ]);
  // Case is ignored for matching but preserved in the output.
  assert.deepEqual(splitHighlights('Garret', ['GARRET']), [{ text: 'Garret', match: true }]);
  // No search, no marks; no text, no segments.
  assert.deepEqual(splitHighlights('Loot', []), [{ text: 'Loot', match: false }]);
  assert.deepEqual(splitHighlights('', ['x']), []);
  // Overlapping words: the longest hit at a position wins, so nothing is left
  // half-marked.
  assert.deepEqual(splitHighlights('orcish', ['orc', 'orcish']), [{ text: 'orcish', match: true }]);
});

test('rehype marks matches inside the rendered tree, not in the markup', () => {
  const tree = {
    type: 'root',
    children: [
      { type: 'element', tagName: 'p', properties: {}, children: [{ type: 'text', value: 'Strahd is here' }] },
      { type: 'element', tagName: 'p', properties: {}, children: [{ type: 'text', value: 'nothing' }] },
    ],
  };
  rehypeMarkMatches({ tokens: ['strahd'] })(tree);

  const [marked, untouched] = tree.children;
  assert.deepEqual(marked.children[0], {
    type: 'element',
    tagName: 'mark',
    properties: {},
    children: [{ type: 'text', value: 'Strahd' }],
  });
  assert.deepEqual(marked.children[1], { type: 'text', value: ' is here' });
  // A paragraph with no hit keeps its original text node.
  assert.deepEqual(untouched.children, [{ type: 'text', value: 'nothing' }]);
});

test('rehype leaves the tree alone when nothing is being searched', () => {
  const children = [{ type: 'text', value: 'Strahd' }];
  const tree = { type: 'root', children };
  rehypeMarkMatches({ tokens: [] })(tree);
  assert.equal(tree.children, children);
});

test('a repeated announcement is made distinct so it is spoken again', () => {
  const first = nextAnnouncement('', 'Loot moved to position 1 of 3');
  assert.equal(first, 'Loot moved to position 1 of 3');

  // Same words twice: the text has to differ or the live region stays silent.
  const repeat = nextAnnouncement(first, 'Loot moved to position 1 of 3');
  assert.notEqual(repeat, first);
  assert.equal(repeat.replace(String.fromCharCode(0x200B), ''), 'Loot moved to position 1 of 3');

  // The marker toggles off again rather than piling up.
  assert.equal(nextAnnouncement(repeat, 'Loot moved to position 1 of 3'), first);
  assert.equal(nextAnnouncement(repeat, 'NPCs moved to position 2 of 3'), 'NPCs moved to position 2 of 3');
  assert.equal(nextAnnouncement(repeat, ''), '');
});

test('a reordered note is described by title, or by position when untitled', () => {
  const notes = [{ id: 'a', title: 'Loot' }, { id: 'b', title: '  ' }, { id: 'c', title: 'NPCs' }];
  assert.equal(describeNotePosition(notes, 'a'), 'Loot moved to position 1 of 3');
  assert.equal(describeNotePosition(notes, 'b'), 'Note 2 moved to position 2 of 3');
  assert.equal(describeNotePosition(notes, 'missing'), '');
});

test('reducer removes only the requested note', () => {
  const state = reduce(
    { notes: [createNote('a'), createNote('b')], focusNoteId: null },
    { type: 'removeNote', id: 'a' },
  );
  assert.deepEqual(state.notes.map((note) => note.id), ['b']);
});

test('reducer moves notes up and down while preserving ids and boundary order', () => {
  const initial = { notes: [createNote('a'), createNote('b'), createNote('c')], focusNoteId: null };
  const boundaryUp = reduce(initial, { type: 'moveNote', id: 'a', offset: -1 });
  const boundaryDown = reduce(initial, { type: 'moveNote', id: 'c', offset: 1 });
  assert.equal(boundaryUp.notes, initial.notes);
  assert.equal(boundaryDown.notes, initial.notes);

  const movedUp = reduce(initial, { type: 'moveNote', id: 'b', offset: -1 });
  assert.deepEqual(movedUp.notes.map((note) => note.id), ['b', 'a', 'c']);
  const movedDown = reduce(movedUp, { type: 'moveNote', id: 'b', offset: 1 });
  assert.deepEqual(movedDown.notes.map((note) => note.id), ['a', 'b', 'c']);
  assert.equal(movedDown.notes[1].id, 'b');
});

test('resolveInstance keeps screen=new unsaved and entirely in memory', () => {
  localStorage.clear();
  const result = storage.resolveInstance('?screen=new', () => 'screen-memory');
  assert.deepEqual(result, { id: 'screen-memory', saved: false, replaceSearch: '' });
  assert.equal(localStorage.length, 0);
});

test('resolveInstance recognizes saved ids and reuses the active id', () => {
  localStorage.clear();
  storage.registerInstance('screen-a', 'Screen A');
  assert.deepEqual(
    storage.resolveInstance('?screen=screen-a'),
    { id: 'screen-a', saved: true, replaceSearch: '' },
  );
  assert.deepEqual(
    storage.resolveInstance(''),
    { id: 'screen-a', saved: true, replaceSearch: '?screen=screen-a' },
  );
});

test('resolveInstance treats an unknown safe id as unsaved and replaces an invalid id', () => {
  localStorage.clear();
  assert.deepEqual(
    storage.resolveInstance('?screen=unknown'),
    { id: 'unknown', saved: false, replaceSearch: '' },
  );
  assert.deepEqual(
    storage.resolveInstance('?screen=!!!', () => 'screen-fresh'),
    { id: 'screen-fresh', saved: false, replaceSearch: '?screen=screen-fresh' },
  );
});

test('unsaved screens write no scoped keys before Save', () => {
  localStorage.clear();
  const wrote = storage.persistNotesIfSaved('screen-new', false, [createNote('a')]);
  assert.equal(wrote, false);
  assert.equal(localStorage.length, 0);
  assert.equal(localStorage.getItem(storage.scopeKey('screen-new')), null);
});

test('Save registration writes the DM Screen registry and active id', () => {
  localStorage.clear();
  const entry = storage.registerInstance('screen-save', 'Session Notes');
  assert.equal(entry.id, 'screen-save');
  assert.ok(storage.readRegistry().some((item) => item.id === 'screen-save' && item.name === 'Session Notes'));
  assert.equal(localStorage.getItem(storage.ACTIVE_KEY), 'screen-save');
});

test('persisted notes use isolated per-screen scoped keys', () => {
  localStorage.clear();
  storage.persistNotes('screen-a', [{ id: 'a', title: 'A', body: 'one' }]);
  storage.persistNotes('screen-b', [{ id: 'b', title: 'B', body: 'two' }]);
  assert.deepEqual(storage.readPersistedNotes('screen-a'), [{ id: 'a', title: 'A', body: 'one', size: { cols: 4, height: 0 } }]);
  assert.deepEqual(storage.readPersistedNotes('screen-b'), [{ id: 'b', title: 'B', body: 'two', size: { cols: 4, height: 0 } }]);
  assert.notEqual(storage.scopeKey('screen-a'), storage.scopeKey('screen-b'));
});

// Swaps in a storage whose setItem rejects the keys matching `shouldFail`, so
// quota/denied writes can be exercised without touching the real backing store.
function withFailingWrites(shouldFail, run) {
  const real = globalThis.localStorage;
  const failing = {
    getItem: (key) => real.getItem(key),
    setItem: (key, value) => {
      if (shouldFail(key)) throw new Error('QuotaExceededError');
      real.setItem(key, value);
    },
    removeItem: (key) => real.removeItem(key),
    clear: () => real.clear(),
    key: (index) => real.key(index),
    get length() { return real.length; },
  };
  Object.defineProperty(globalThis, 'localStorage', { value: failing, configurable: true });
  try {
    return run();
  } finally {
    Object.defineProperty(globalThis, 'localStorage', { value: real, configurable: true });
  }
}

test('Save writes notes, registry, and active id together', () => {
  localStorage.clear();
  const entry = storage.saveInstanceWithNotes('screen-atomic', 'Session Notes', [{ id: 'a', title: 'A', body: 'one' }]);
  assert.equal(entry.id, 'screen-atomic');
  assert.deepEqual(storage.readPersistedNotes('screen-atomic'), [{ id: 'a', title: 'A', body: 'one', size: { cols: 4, height: 0 } }]);
  assert.ok(storage.readRegistry().some((item) => item.id === 'screen-atomic'));
  assert.equal(localStorage.getItem(storage.ACTIVE_KEY), 'screen-atomic');
});

test('Save leaves no registry entry when the notes write fails', () => {
  localStorage.clear();
  const entry = withFailingWrites(
    (key) => key === storage.scopeKey('screen-quota'),
    () => storage.saveInstanceWithNotes('screen-quota', 'Session Notes', [{ id: 'a', title: 'A', body: 'one' }]),
  );
  assert.equal(entry, null);
  assert.deepEqual(storage.readRegistry(), []);
  assert.equal(localStorage.getItem(storage.ACTIVE_KEY), null);
  assert.equal(localStorage.getItem(storage.scopeKey('screen-quota')), null);
});

test('Save rolls the notes write back when the registry write fails', () => {
  localStorage.clear();
  const entry = withFailingWrites(
    (key) => key === storage.REGISTRY_KEY,
    () => storage.saveInstanceWithNotes('screen-reg-fail', 'Session Notes', [{ id: 'a', title: 'A', body: 'one' }]),
  );
  assert.equal(entry, null);
  assert.equal(localStorage.getItem(storage.scopeKey('screen-reg-fail')), null);
  assert.equal(localStorage.getItem(storage.ACTIVE_KEY), null);
  assert.equal(localStorage.length, 0);
});

test('Save rolls registry and notes back when the active-id write fails', () => {
  localStorage.clear();
  const entry = withFailingWrites(
    (key) => key === storage.ACTIVE_KEY,
    () => storage.saveInstanceWithNotes('screen-active-fail', 'Session Notes', [{ id: 'a', title: 'A', body: 'one' }]),
  );
  assert.equal(entry, null);
  assert.deepEqual(storage.readRegistry(), []);
  assert.equal(localStorage.getItem(storage.scopeKey('screen-active-fail')), null);
  assert.equal(localStorage.length, 0);
});

test('a failed re-save keeps the notes already stored for that screen', () => {
  localStorage.clear();
  storage.saveInstanceWithNotes('screen-existing', 'Session Notes', [{ id: 'a', title: 'A', body: 'one' }]);
  const entry = withFailingWrites(
    (key) => key === storage.REGISTRY_KEY,
    () => storage.saveInstanceWithNotes('screen-existing', 'Session Notes', [{ id: 'a', title: 'A', body: 'two' }]),
  );
  assert.equal(entry, null);
  assert.deepEqual(storage.readPersistedNotes('screen-existing'), [{ id: 'a', title: 'A', body: 'two', size: { cols: 4, height: 0 } }]);
});

test('persisted notes round-trip their size in the v2 payload', () => {
  localStorage.clear();
  storage.persistNotes('screen-size', [{ id: 'a', title: 'A', body: 'one', size: { cols: 12, height: 320 } }]);
  assert.equal(JSON.parse(localStorage.getItem(storage.scopeKey('screen-size'))).version, 2);
  assert.deepEqual(
    storage.readPersistedNotes('screen-size'),
    [{ id: 'a', title: 'A', body: 'one', size: { cols: 12, height: 320 } }],
  );
});

test('v1 payloads are read with default sizes and the v2 write wins afterwards', () => {
  localStorage.clear();
  const legacyKey = storage.scopeKey('screen-legacy', storage.LEGACY_NOTES_STORAGE_KEY);
  localStorage.setItem(legacyKey, JSON.stringify({
    version: 1,
    notes: [{ id: 'a', title: 'Old', body: 'kept' }],
  }));

  assert.deepEqual(
    storage.readPersistedNotes('screen-legacy'),
    [{ id: 'a', title: 'Old', body: 'kept', size: { cols: 4, height: 0 } }],
  );

  storage.persistNotes('screen-legacy', [{ id: 'a', title: 'Old', body: 'kept', size: { cols: 6, height: 200 } }]);
  assert.deepEqual(
    storage.readPersistedNotes('screen-legacy'),
    [{ id: 'a', title: 'Old', body: 'kept', size: { cols: 6, height: 200 } }],
  );
  // The v1 copy survives so a rolled-back save can never destroy the only data.
  assert.notEqual(localStorage.getItem(legacyKey), null);
});

test('a corrupt size is normalized instead of discarding the note', () => {
  localStorage.clear();
  localStorage.setItem(storage.scopeKey('screen-bad-size'), JSON.stringify({
    version: 2,
    notes: [{ id: 'a', title: 'A', body: 'one', size: { cols: 99, height: 'tall' } }],
  }));
  assert.deepEqual(
    storage.readPersistedNotes('screen-bad-size'),
    [{ id: 'a', title: 'A', body: 'one', size: { cols: 12, height: 0 } }],
  );
});

test('missing and corrupt persisted payloads fail soft to an empty board', () => {
  localStorage.clear();
  assert.deepEqual(storage.readPersistedNotes('missing'), []);

  localStorage.setItem(storage.scopeKey('broken-json'), '{');
  assert.deepEqual(storage.readPersistedNotes('broken-json'), []);

  localStorage.setItem(storage.scopeKey('wrong-version'), JSON.stringify({ version: 3, notes: [] }));
  assert.deepEqual(storage.readPersistedNotes('wrong-version'), []);

  localStorage.setItem(storage.scopeKey('wrong-schema'), JSON.stringify({ version: 1, notes: [{ id: 'x', title: 4, body: '' }] }));
  assert.deepEqual(storage.readPersistedNotes('wrong-schema'), []);
});
