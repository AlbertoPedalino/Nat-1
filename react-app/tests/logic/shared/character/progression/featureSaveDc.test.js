import test from 'node:test';
import assert from 'node:assert/strict';
import { featureSaveDc, saveDcPills } from '../../../../../src/shared/character/progression/featureSaveDc.js';

// Level 5: Proficiency Bonus +3.
const character = { level: 5, scoreMethod: 'manual', manualScores: { str: 14, dex: 18, wis: 16 } };

test('a feature save DC is 8 + the ability modifier + PB; a choice uses the best ability', () => {
  assert.equal(featureSaveDc(character, 'wis'), 14);
  assert.equal(featureSaveDc(character, ['str', 'dex']), 15);
});

test('the Save DC pill waits for the level the save arrives at', () => {
  const pills = saveDcPills('wis', { minLevel: 7 });
  assert.deepEqual(pills({ character, ownerLevel: 5 }), []);
  assert.deepEqual(pills({ character, ownerLevel: 7 }), [{ label: 'Save DC', value: 14 }]);
  assert.deepEqual(saveDcPills('dex')({ character, ownerLevel: 1 }), [{ label: 'Save DC', value: 15 }]);
});
