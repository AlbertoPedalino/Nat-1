import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GHOST_TTL_MS,
  applyCommittedDrawing,
  applyCommittedToken,
  applyDrawingEvent,
  applyTokenEvent,
  dropGhost,
  movableFilter,
  pruneGhosts,
  putGhost,
  resolveTokens,
  settleGhost,
} from '../../../../../src/shared/vtt/session/liveScene.js';

const row = (id, patch = {}) => ({
  id, scene_id: 's1', layer: 'tokens', x: 0, y: 0, w: 1, h: 1, z: 0, ...patch,
});

test('a remote insert adds the token, an update replaces it in place', () => {
  let tokens = applyTokenEvent([], { eventType: 'INSERT', new: row('t1') });
  assert.equal(tokens.length, 1);

  tokens = applyTokenEvent(tokens, { eventType: 'UPDATE', new: row('t1', { x: 4, y: 5 }) });
  assert.equal(tokens.length, 1, 'an update must not duplicate the row');
  assert.equal(tokens[0].x, 4);
  assert.equal(tokens[0].y, 5);
});

// The secret label is a row in another table, which no token event carries. It
// has to survive one, or the encounter builder writing hit points into a piece
// would strip the name the GM gave it.
test('a remote update keeps the GM-only label the row cannot carry', () => {
  const tokens = [{
    id: 't1', sceneId: 's1', layer: 'gm', x: 0, y: 0, label: '', secretLabel: 'Pit · DC 13',
  }];
  const after = applyTokenEvent(tokens, { eventType: 'UPDATE', new: row('t1', { hp_current: 4 }) });
  assert.equal(after[0].secretLabel, 'Pit · DC 13');
  assert.equal(after[0].hpCurrent, 4);

  // A piece that never had one is left exactly as the row describes it.
  const plain = applyTokenEvent(
    [{ id: 't2', sceneId: 's1', layer: 'tokens', x: 0, y: 0, label: 'Ogre' }],
    { eventType: 'UPDATE', new: row('t2', { label: 'Ogre A' }) },
  );
  assert.equal(plain[0].secretLabel, '');
  assert.equal(plain[0].label, 'Ogre A');
});

test('a remote delete removes only its own row', () => {
  const tokens = [row('t1'), row('t2')].map((item) => applyTokenEvent([], { eventType: 'INSERT', new: item })[0]);
  const after = applyTokenEvent(tokens, { eventType: 'DELETE', old: { id: 't1' } });
  assert.deepEqual(after.map((token) => token.id), ['t2']);
  assert.equal(applyTokenEvent(tokens, { eventType: 'DELETE', old: {} }).length, 2);
});

// The bug this prevents: you drop a piece, your own commit comes back as an
// event, and it snaps out from under the pointer if you have grabbed it again.
test('an event for the token under the local pointer is ignored', () => {
  const tokens = applyTokenEvent([], { eventType: 'INSERT', new: row('t1', { x: 9 }) });
  const during = applyTokenEvent(tokens, { eventType: 'UPDATE', new: row('t1', { x: 0 }) }, { draggingId: 't1' });
  assert.equal(during[0].x, 9, 'the local gesture wins while it lasts');

  const after = applyTokenEvent(tokens, { eventType: 'UPDATE', new: row('t1', { x: 0 }) }, { draggingId: 't2' });
  assert.equal(after[0].x, 0, 'and the remote version applies once it is over');
});

test('a malformed event leaves the list alone', () => {
  const tokens = applyTokenEvent([], { eventType: 'INSERT', new: row('t1') });
  assert.equal(applyTokenEvent(tokens, { eventType: 'UPDATE', new: null }), tokens);
  assert.equal(applyTokenEvent(tokens, {}).length, 1);
  assert.equal(applyTokenEvent(null, { eventType: 'INSERT', new: row('t9') }).length, 1);
});

test('ghosts paint somebody else drag, never your own', () => {
  const tokens = applyTokenEvent([], { eventType: 'INSERT', new: row('t1', { x: 1, y: 1 }) });
  const ghosts = putGhost({}, { id: 't1', x: 7, y: 8, actor: 'other' });

  assert.equal(resolveTokens(tokens, ghosts)[0].x, 7);
  assert.equal(resolveTokens(tokens, ghosts, 't1')[0].x, 1, 'the piece I am dragging follows my pointer');
  assert.equal(resolveTokens(tokens, {})[0].x, 1);
  assert.equal(resolveTokens(tokens, null)[0].x, 1);
});

test('dropping a ghost restores the committed position', () => {
  const ghosts = putGhost({}, { id: 't1', x: 7, y: 8 });
  assert.deepEqual(Object.keys(dropGhost(ghosts, 't1')), []);
  assert.equal(dropGhost(ghosts, 'missing'), ghosts, 'an unknown id changes nothing');
});

// A client that disappears mid-drag never sends its release: without expiry its
// piece would sit at the ghost position forever.
test('ghosts expire so a dropped connection cannot pin a token', () => {
  const now = 10_000;
  const ghosts = putGhost({}, { id: 't1', x: 3, y: 3 }, now);
  assert.equal(Object.keys(pruneGhosts(ghosts, now + GHOST_TTL_MS - 1)).length, 1);
  assert.equal(Object.keys(pruneGhosts(ghosts, now + GHOST_TTL_MS + 1)).length, 0);
  assert.equal(pruneGhosts(ghosts, now), ghosts, 'nothing expired means the same object back');
});

// Mirrors the RLS update policy. The database is the authority; this only stops
// the UI from offering a drag the server would refuse.
test('a player may drag only their own non-GM pieces', () => {
  const canMove = movableFilter({ isGm: false, ownedCharacterIds: ['char-mine'] });
  assert.equal(canMove({ layer: 'tokens', characterId: 'char-mine' }), true);
  assert.equal(canMove({ layer: 'tokens', characterId: 'char-theirs' }), false);
  assert.equal(canMove({ layer: 'tokens', characterId: null }), false);
  assert.equal(canMove({ layer: 'gm', characterId: 'char-mine' }), false);
  assert.equal(canMove(null), false);

  const gm = movableFilter({ isGm: true });
  assert.equal(gm({ layer: 'gm', characterId: null }), true);
});

// The rubber band: a piece moved twice in quick succession. The first move's
// echo lands while the second is still being written, and used to pull the
// piece back before the second echo pushed it forward again.
test('a piece moved twice never jumps back to its first drop', () => {
  const at = (iso) => ({ updated_at: iso });
  let tokens = applyTokenEvent([], { eventType: 'INSERT', new: row('t1', { x: 0, ...at('2026-10-21T10:00:00.000Z') }) });
  // Both drops shown locally at once.
  tokens = tokens.map((token) => ({ ...token, x: 2 }));
  tokens = tokens.map((token) => ({ ...token, x: 5 }));

  // The first echo while the second write is in flight: held back.
  const first = row('t1', { x: 2, ...at('2026-10-21T10:00:01.000Z') });
  tokens = applyTokenEvent(tokens, { eventType: 'UPDATE', new: first }, { pendingIds: new Set(['t1']) });
  assert.equal(tokens[0].x, 5);

  // The second write answers: that row is the piece now.
  const second = row('t1', { x: 5, hp_current: 7, ...at('2026-10-21T10:00:02.000Z') });
  const committed = applyTokenEvent([], { eventType: 'INSERT', new: second })[0];
  tokens = applyCommittedToken(tokens, committed);
  assert.equal(tokens[0].x, 5);
  assert.equal(tokens[0].hpCurrent, 7);

  // The first echo arriving even later than that is history, not news.
  tokens = applyTokenEvent(tokens, { eventType: 'UPDATE', new: first });
  assert.equal(tokens[0].x, 5);

  // Anything newer still comes through.
  tokens = applyTokenEvent(tokens, { eventType: 'UPDATE', new: row('t1', { x: 8, ...at('2026-10-21T10:00:03.000Z') }) });
  assert.equal(tokens[0].x, 8);
});

test('a committed row keeps the GM-only label and never replaces a newer one', () => {
  const held = [{ id: 't1', x: 3, updatedAt: 2000, secretLabel: 'Pit' }];
  assert.deepEqual(applyCommittedToken(held, { id: 't1', x: 1, updatedAt: 1000 }), held);
  const after = applyCommittedToken(held, { id: 't1', x: 4, updatedAt: 3000, secretLabel: '' });
  assert.equal(after[0].x, 4);
  assert.equal(after[0].secretLabel, 'Pit');
});

// The same rubber band on everybody else's screen: the piece is picked up
// again before its first drop comes back, and that late row used to wipe the
// ghost of the second drag.
test('a row replaces a ghost only once its drag has been let go', () => {
  let ghosts = putGhost({}, { id: 't1', x: 6, y: 1, actor: 'gm' });
  // The first drop's row lands while the second drag is still going.
  assert.equal(settleGhost(ghosts, 't1'), ghosts);
  // Let go: the next row is the one this drag produced.
  ghosts = putGhost(ghosts, { id: 't1', x: 7, y: 1, actor: 'gm', released: true });
  assert.deepEqual(settleGhost(ghosts, 't1'), {});
  assert.deepEqual(settleGhost({}, 't1'), {});
});

// After the drop, a late echo of an older write (hit points from the encounter
// builder) still stands where the piece was: it must not end the drag preview
// and show the piece back there until the move's own row arrives.
test('a released ghost waits for the row standing where the piece was let go', () => {
  const ghosts = putGhost({}, { id: 't1', x: 7, y: 1, actor: 'gm', released: true });
  assert.equal(settleGhost(ghosts, 't1', row('t1', { x: 2, y: 1 })), ghosts);
  assert.deepEqual(settleGhost(ghosts, 't1', row('t1', { x: 7, y: 1 })), {});
  // A row without a position cannot tell, and does not hold the ghost.
  assert.deepEqual(settleGhost(ghosts, 't1', { id: 't1' }), {});
});

const mark = (id, patch = {}) => ({
  id, scene_id: 's1', layer: 'tokens', points: [{ x: 0, y: 0 }, { x: 1, y: 1 }], color: '#e8c96a', ...patch,
});

test('mark events add, replace and remove, and an older version is history', () => {
  let marks = applyDrawingEvent([], { eventType: 'INSERT', new: mark('d1', { updated_at: '2026-10-20T10:00:01Z' }) });
  assert.equal(marks.length, 1);
  marks = applyDrawingEvent(marks, {
    eventType: 'UPDATE', new: mark('d1', { color: '#ff0000', updated_at: '2026-10-20T10:00:03Z' }),
  });
  assert.equal(marks[0].color, '#ff0000');
  // The echo of an earlier colour lands late: kept as it is.
  const late = applyDrawingEvent(marks, {
    eventType: 'UPDATE', new: mark('d1', { color: '#00ff00', updated_at: '2026-10-20T10:00:02Z' }),
  });
  assert.equal(late, marks);
  assert.deepEqual(applyDrawingEvent(marks, { eventType: 'DELETE', old: { id: 'd1' } }), []);
});

// Two colours picked one after the other: the first write's echo lands while
// the second is still being written, and used to flash the first colour back.
test('a mark still being written ignores its echoes until its last write answers', () => {
  const held = [{ id: 'd1', color: '#0000ff', updatedAt: 1000 }];
  const echo = { eventType: 'UPDATE', new: mark('d1', { color: '#ff0000', updated_at: '2026-10-20T10:00:02Z' }) };
  assert.equal(applyDrawingEvent(held, echo, { pendingIds: new Set(['d1']) }), held);
  const answered = applyCommittedDrawing(held, { id: 'd1', color: '#0000ff', updatedAt: 5000 });
  assert.equal(answered[0].updatedAt, 5000);
  assert.equal(applyCommittedDrawing(answered, { id: 'd1', color: '#ff0000', updatedAt: 4000 }), answered);
});
