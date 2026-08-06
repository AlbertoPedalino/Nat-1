import test from 'node:test';
import assert from 'node:assert/strict';
import {
  HEX_STATUSES,
  hexCellsByKey,
  hexStatusColor,
  normalizeHexStatus,
  toHexCell,
  toHexCellPatch,
} from './hexCell.js';

test('a row becomes a hex the editor can read', () => {
  const cell = toHexCell({
    scene_id: 'scene-1',
    q: 2,
    r: -3,
    terrain: 'Forest',
    tier: '2',
    pop: 'frontier',
    status: 'travelled',
    note: 'Burnt watchtower',
    revealed: true,
    updated_at: '2026-01-01T00:00:00.000Z',
  });
  assert.equal(cell.q, 2);
  assert.equal(cell.r, -3);
  assert.equal(cell.tier, 2);
  assert.equal(cell.status, 'travelled');
  assert.equal(cell.revealed, true);
  assert.equal(toHexCell({ q: null, r: null }), null);
});

test('an unknown status falls back to unexplored rather than painting nonsense', () => {
  assert.equal(normalizeHexStatus('DANGER'), 'danger');
  assert.equal(normalizeHexStatus('haunted'), 'unexplored');
  assert.equal(normalizeHexStatus(null), 'unexplored');
  for (const status of HEX_STATUSES) assert.equal(normalizeHexStatus(status), status);
});

test('the colour is derived, and an untouched hex has none', () => {
  assert.equal(hexStatusColor('unexplored'), null);
  assert.match(hexStatusColor('danger'), /^#[0-9a-f]{6}$/i);
  assert.equal(hexStatusColor('nonsense'), null, 'unknown falls back to unexplored, which is untinted');
});

test('a patch carries only the columns a client may write', () => {
  const patch = toHexCellPatch({
    status: 'SCOUTED',
    revealed: 1,
    tier: '3',
    note: 'x'.repeat(500),
    q: 9,
    scene_id: 'somewhere-else',
  });
  assert.deepEqual(Object.keys(patch).sort(), ['note', 'revealed', 'status', 'tier']);
  assert.equal(patch.status, 'scouted');
  assert.equal(patch.revealed, true);
  assert.equal(patch.tier, 3);
  assert.equal(patch.note.length, 400);
  // Moving a hex is not a thing: the coordinates are the key.
  assert.equal(patch.q, undefined);
});

test('the overlay gets a lookup by hex with the colour already resolved', () => {
  const map = hexCellsByKey([
    { q: 0, r: 0, status: 'danger' },
    { q: 1, r: -1, status: 'unexplored' },
    null,
  ]);
  assert.equal(map.size, 2);
  assert.equal(map.get('0:0').color, hexStatusColor('danger'));
  assert.equal(map.get('1:-1').color, null);
});

// The country the party has walked is the one tint a campaign accumulates, so
// it is the one the GM can re-colour. The marks keep their own tones.
test('the travelled tint can be re-coloured, the other marks cannot', () => {
  assert.equal(hexStatusColor('travelled', '#2266aa'), '#2266aa');
  assert.equal(hexStatusColor('danger', '#2266aa'), hexStatusColor('danger'));
  assert.equal(hexStatusColor('unexplored', '#2266aa'), null);

  const map = hexCellsByKey(
    [{ q: 0, r: 0, status: 'travelled' }],
    { travelledColor: '#2266aa' },
  );
  assert.equal(map.get('0:0').color, '#2266aa');
});
