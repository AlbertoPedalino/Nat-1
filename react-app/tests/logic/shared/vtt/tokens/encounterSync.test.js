import test from 'node:test';
import assert from 'node:assert/strict';
import {
  makeSourceRef,
  parseSourceRef,
} from '../../../../../src/shared/vtt/tokens/encounterSync.js';

test('a source reference survives a round trip', () => {
  const ref = makeSourceRef('enc_1', 'fight_1', 3);
  assert.equal(ref, 'enc_1:fight_1:3');
  assert.deepEqual(parseSourceRef(ref), { instanceId: 'enc_1', fightId: 'fight_1', combatantId: '3' });
});

// A colon inside an id would shift every field after it and quietly point the
// token at the wrong combatant.
test('an id containing the separator is refused rather than mangled', () => {
  assert.equal(makeSourceRef('enc:1', 'fight_1', 3), null);
  assert.equal(makeSourceRef('enc_1', null, 3), null);
  assert.equal(makeSourceRef('enc_1', 'fight_1', null), null);
  assert.equal(parseSourceRef('too:many:parts:here'), null);
  assert.equal(parseSourceRef('enc_1::3'), null);
  assert.equal(parseSourceRef(''), null);
});

// Combatant id 0 is falsy and is the first combatant the encounter builder
// creates: dropping it would leave one creature permanently unsynced.
test('the first combatant, whose id is zero, is not lost', () => {
  assert.equal(makeSourceRef('enc_1', 'fight_1', 0), 'enc_1:fight_1:0');
  assert.deepEqual(parseSourceRef('enc_1:fight_1:0').combatantId, '0');
});
