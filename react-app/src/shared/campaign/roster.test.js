import test from 'node:test';
import assert from 'node:assert/strict';
import {
  placedCharacterIds,
  toRoster,
  toRosterEntry,
  withSheetVitals,
} from './roster.js';

const row = (id, data) => ({ id, name: 'Row name', owner: 'u1', data });

test('a roster entry prefers the sheet name and keeps its class and valid colour', () => {
  const entry = toRosterEntry(row('c1', {
    name: 'Aria', className: 'Wizard', classIconColor: '#AABBCC', deathSaves: { success: 2, fail: 1 },
  }));
  assert.equal(entry.characterId, 'c1');
  assert.equal(entry.name, 'Aria');
  assert.equal(entry.color, '#aabbcc');
  assert.equal(entry.className, 'Wizard');
  assert.deepEqual(entry.deathSaves, { success: 2, fail: 1 });
  assert.equal(toRosterEntry(row('c2', {})).name, 'Row name');
  assert.equal(toRosterEntry(row('c3', { classIconColor: 'red' })).color, null);
  assert.equal(toRosterEntry(null), null);
  assert.deepEqual(toRoster([null, row('c1', {})]).map((e) => e.characterId), ['c1']);
});

// Max HP is derived from hit dice, Constitution and class features, so it is
// never on the stored sheet. Reading `data.maxHP` returned undefined for almost
// every character and the bar simply never appeared — readCampaignVitals fills
// these in after loading the adapters.
test('a roster entry starts with no hit points, because max HP is derived', () => {
  const entry = toRosterEntry(row('c1', { name: 'Aria', currentHP: 9, maxHP: 22 }));
  assert.equal(entry.hpMax, null);
  assert.equal(entry.hpCurrent, null);
});

test('derived hit points are overlaid onto the pieces that stand for characters', () => {
  const roster = toRoster([row('c1', { name: 'Aria' })])
    .map((entry) => ({ ...entry, hpCurrent: 9, hpMax: 22, tempHp: 4 }));
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
  const roster = toRoster([row('c1', { name: 'Aria', activeConditions: ['prone'] })]);
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
  const roster = toRoster([row('c1', { name: 'Aria', activeConditions: ['blinded'] })])
    .map((entry) => ({ ...entry, hpCurrent: 9, hpMax: 22 }));
  const merged = withSheetVitals([{ id: 't1', characterId: 'c1', conditions: ['prone'] }], roster);
  assert.deepEqual(merged[0].conditions, ['blinded']);
});

test('placed character ids ignore pieces that stand for nobody', () => {
  const placed = placedCharacterIds([{ characterId: 'c1' }, { characterId: null }, null]);
  assert.equal(placed.has('c1'), true);
  assert.equal(placed.size, 1);
});
