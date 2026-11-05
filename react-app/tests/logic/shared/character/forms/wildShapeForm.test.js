import test from 'node:test';
import assert from 'node:assert/strict';
import {
  wildShapeArmorClass, wildShapeSenses, wildShapeSpeed,
} from '../../../../../src/shared/character/forms/wildShapeForm.js';

const druid = { name: 'Druid', speciesSnapshot: { speed: 30 } };
const wolf = {
  ...druid,
  wildShape: { beast: { name: 'Wolf', ac: 13, speed: { walk: 40 }, senses: ['Darkvision 60 ft.', 'Keen Smell'] } },
};

test('the beast replaces armor class, speed and senses; your own form asks nothing', () => {
  assert.deepEqual(wildShapeArmorClass(wolf), {
    value: 13, source: 'Wild Shape (Wolf)', label: 'AC (Beast)', formulaLabel: 'Beast',
    shieldApplied: false, shieldBonus: 0, sourceType: 'wildshape',
  });
  assert.deepEqual(wildShapeSpeed(wolf), { walk: 40 });
  assert.deepEqual(wildShapeSenses(wolf), [{ type: 'darkvision', range: 60, note: 'Darkvision 60 ft.' }]);

  assert.equal(wildShapeArmorClass(druid), null);
  assert.equal(wildShapeSpeed(druid), null);
  assert.deepEqual(wildShapeSenses(druid), []);
});
