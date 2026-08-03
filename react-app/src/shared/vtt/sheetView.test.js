import test from 'node:test';
import assert from 'node:assert/strict';
import { sheetChoicesForRole } from './sheetView.js';

const roster = [
  { characterId: 'c1', name: 'Aria' },
  { characterId: 'c2', name: 'Borin' },
  { characterId: null, name: 'Invalid' },
];

test('the GM may switch to every campaign sheet', () => {
  assert.deepEqual(
    sheetChoicesForRole(roster, { isGm: true }).map((entry) => entry.characterId),
    ['c1', 'c2'],
  );
});

test('a player may switch only to sheets they own', () => {
  assert.deepEqual(
    sheetChoicesForRole(roster, { ownedCharacterIds: ['c2', 'missing'] }),
    [roster[1]],
  );
});
