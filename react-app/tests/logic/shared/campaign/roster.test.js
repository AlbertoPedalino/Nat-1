import test from 'node:test';
import assert from 'node:assert/strict';
import {
  placedCharacterIds,
  toCampaignMembers,
  withSheetVitals,
} from '../../../../src/shared/campaign/roster.js';

const row = (id, data) => ({ id, name: 'Row name', owner: 'u1', data });
// A roster entry as rosterEntryFromDigest builds it; hit points null until the
// base maximum is known.
const entry = (characterId, fields = {}) => ({
  characterId, name: 'Aria', hpCurrent: null, hpMax: null, tempHp: 0, maxHpBonus: 0,
  conditions: [], effects: [], deathSaves: { success: 0, fail: 0 }, ...fields,
});

test('the scene list counts a campaign by who is in it, nothing more', () => {
  assert.deepEqual(toCampaignMembers([null, row('c1', { name: 'Aria' }), row('c2', {})]), [
    { characterId: 'c1', name: 'Aria' },
    { characterId: 'c2', name: 'Row name' },
  ]);
});

test('derived hit points are overlaid onto the pieces that stand for characters', () => {
  const roster = [entry('c1', { hpCurrent: 9, hpMax: 22, tempHp: 4 })];
  const tokens = [
    { id: 't1', characterId: 'c1', hpCurrent: null, hpMax: null },
    { id: 't2', characterId: null, hpCurrent: 4, hpMax: 7 },
  ];

  const merged = withSheetVitals(tokens, roster);
  assert.equal(merged[0].hpCurrent, 9);
  assert.equal(merged[0].hpMax, 22);
  assert.equal(merged[0].tempHp, 4);
  // `fromSheet` is what earns a piece the printed numbers: the party tracks its
  // own hit points, a monster's are the GM's business.
  assert.equal(merged[0].fromSheet, true);

  // A monster keeps its own: its stat block has no per-creature state.
  assert.equal(merged[1].hpCurrent, 4);
  assert.equal(merged[1].hpMax, 7);
  assert.equal(merged[1].fromSheet, undefined);
});

// Hit points are derived and arrive late; conditions are stored and arrive at
// once. Gating the second on the first left a character looking unafflicted
// until the class adapters had loaded.
test('conditions reach the piece even before the hit points can be derived', () => {
  const roster = [entry('c1', { conditions: ['prone'] })];
  const tokens = [{ id: 't1', characterId: 'c1', hpCurrent: 3, hpMax: 5 }];
  const merged = withSheetVitals(tokens, roster);
  assert.deepEqual(merged[0].conditions, ['prone']);
  assert.equal(merged[0].hpMax, 5, 'the piece keeps what it had');

  assert.deepEqual(withSheetVitals(tokens, []), tokens);
  assert.deepEqual(withSheetVitals(null, roster), []);
});

// The sheet owns a character's conditions the way it owns their hit points: the
// map shows them and writes back, it never keeps a second copy.
test('sheet conditions replace whatever the piece was carrying', () => {
  const roster = [entry('c1', { conditions: ['blinded'], hpCurrent: 9, hpMax: 22 })];
  const merged = withSheetVitals([{ id: 't1', characterId: 'c1', conditions: ['prone'] }], roster);
  assert.deepEqual(merged[0].conditions, ['blinded']);
});

test('placed character ids ignore pieces that stand for nobody', () => {
  const placed = placedCharacterIds([{ characterId: 'c1' }, { characterId: null }, null]);
  assert.equal(placed.has('c1'), true);
  assert.equal(placed.size, 1);
});

// Reminders are the sheet's too: the piece shows them and never keeps its own
// copy.
test('sheet reminders replace whatever the piece was carrying', () => {
  const roster = [entry('c1', { effects: [{ key: 'custom', text: 'Guidance' }] })];
  const tokens = [{ id: 't1', characterId: 'c1', effects: [{ key: 'custom', text: 'Bless' }] }];
  assert.deepEqual(withSheetVitals(tokens, roster)[0].effects, [{ key: 'custom', text: 'Guidance' }]);
  const monster = [{ id: 'm1', effects: [{ key: 'custom', text: 'Bless' }] }];
  assert.deepEqual(withSheetVitals(monster, roster)[0].effects, [{ key: 'custom', text: 'Bless' }]);
});
