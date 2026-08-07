import test from 'node:test';
import assert from 'node:assert/strict';
import {
  monsterRefs,
  rowBelongsToFight,
  tokenFromRow,
  tokenPatchFromCombatant,
  vitalsSignature,
} from './tokenBridge.js';

const COMBAT = {
  fightId: 1786095432787,
  combatants: [
    { id: 0, type: 'monster', name: 'Ogre', hpCurrent: 59, hpMax: 59, activeConditions: [], activeEffects: [] },
    { id: 1, type: 'monster', name: 'Goblin', hpCurrent: 7, hpMax: 7, activeConditions: [], activeEffects: [] },
    { id: 2, type: 'player', name: 'Aria', sourceId: 'char-1', hpCurrent: 22, hpMax: 22 },
  ],
};

// A player's piece is placed from the roster and carries no reference: it syncs
// through the sheet, which is a row both tools already share.
test('only creatures get a reference, and it is the one the map wrote', () => {
  const refs = monsterRefs(COMBAT, 'enc_a');
  assert.deepEqual(refs.map((entry) => entry.ref), [
    'enc_a:1786095432787:0',
    'enc_a:1786095432787:1',
  ]);
});

test('a fight with no id, or no instance, has nothing to point at', () => {
  assert.deepEqual(monsterRefs({ ...COMBAT, fightId: null }, 'enc_a'), []);
  assert.deepEqual(monsterRefs(COMBAT, ''), []);
  assert.deepEqual(monsterRefs(null, 'enc_a'), []);
});

// One subscription carries every piece the GM may see, so this is what sorts
// this fight's creatures out of the whole campaign's board.
test('a row is claimed only by the fight that owns it', () => {
  assert.equal(rowBelongsToFight({ source_ref: 'enc_a:99:0' }, 'enc_a', 99), true);
  assert.equal(rowBelongsToFight({ source_ref: 'enc_a:99:0' }, 'enc_a', 100), false);
  assert.equal(rowBelongsToFight({ source_ref: 'enc_b:99:0' }, 'enc_a', 99), false);
  assert.equal(rowBelongsToFight({ source_ref: null }, 'enc_a', 99), false);
  assert.equal(rowBelongsToFight({}, 'enc_a', 99), false);
});

test('a row becomes the piece shape the reconciler reads', () => {
  const token = tokenFromRow({
    id: 't1',
    source_ref: 'enc_a:99:0',
    hp_current: 12,
    hp_max: 59,
    conditions: ['prone'],
    effects: [],
  });
  assert.deepEqual(token, {
    sourceRef: 'enc_a:99:0',
    hpCurrent: 12,
    hpMax: 59,
    conditions: ['prone'],
    effects: [],
  });
  assert.equal(tokenFromRow({ id: 't2' }), null);
});

test('a combatant becomes row columns, not editor fields', () => {
  assert.deepEqual(
    tokenPatchFromCombatant({ hpCurrent: 12, hpMax: 59, activeConditions: ['prone'], activeEffects: [] }),
    { hp_current: 12, hp_max: 59, conditions: ['prone'], effects: [] },
  );
});

// The signature is what stops a write coming back as a second one, so both
// spellings of the same vitals have to read the same.
test('a combatant and the row it wrote share one signature', () => {
  const combatant = { hpCurrent: 12, hpMax: 59, activeConditions: ['prone'], activeEffects: [] };
  const row = { hp_current: 12, hp_max: 59, conditions: ['prone'], effects: [] };
  assert.equal(vitalsSignature(combatant), vitalsSignature(row));
  assert.notEqual(vitalsSignature(combatant), vitalsSignature({ ...combatant, hpCurrent: 11 }));
  assert.notEqual(vitalsSignature(combatant), vitalsSignature({ ...combatant, activeConditions: [] }));
  assert.equal(vitalsSignature(null), vitalsSignature({}));
});
