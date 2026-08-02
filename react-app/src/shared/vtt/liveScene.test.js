import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GHOST_TTL_MS,
  applyTokenEvent,
  dropGhost,
  movableFilter,
  pruneGhosts,
  putGhost,
  resolveTokens,
} from './liveScene.js';

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
