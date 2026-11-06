import test from 'node:test';
import assert from 'node:assert/strict';
import { isStatBlockLeadIn, statBlockTagText } from '../../../../src/shared/content/statBlockTags.js';

test('2024 attack and save lead-ins read as the printed stat block', () => {
  assert.equal(statBlockTagText('atkr', 'm'), 'Melee Attack Roll:');
  assert.equal(statBlockTagText('atkr', 'm,r'), 'Melee or Ranged Attack Roll:');
  assert.equal(statBlockTagText('actsave', 'con'), 'Constitution Saving Throw:');
  assert.equal(statBlockTagText('actsavefail', ''), 'Failure:');
  assert.equal(statBlockTagText('actsavefail', '2'), 'Second Failure:');
  assert.equal(statBlockTagText('actsavefailby', '5'), 'Failure by 5 or More:');
  assert.equal(statBlockTagText('h'), 'Hit: ');
  assert.equal(statBlockTagText('hom'), 'Hit or Miss: ');
});

test('DC and Recharge are plain text; other tags are not labels', () => {
  assert.equal(statBlockTagText('dc', '13'), 'DC 13');
  assert.equal(statBlockTagText('recharge', '5'), '(Recharge 5-6)');
  assert.equal(statBlockTagText('recharge', ''), '(Recharge 6)');
  assert.equal(statBlockTagText('spell', 'fireball|XPHB'), null);
  assert.equal(isStatBlockLeadIn('atkr'), true);
  assert.equal(isStatBlockLeadIn('dc'), false);
});
