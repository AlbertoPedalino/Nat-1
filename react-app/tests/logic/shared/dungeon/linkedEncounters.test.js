import test from 'node:test';
import assert from 'node:assert/strict';
import { pickEncounterInstance, pickEncounterInstanceInGroup } from '../../../../src/shared/dungeon/linkedEncounters.js';

// Cloud rows spell it `link_group_id`; the local registry spells it
// `linkGroupId`. The walk is the same either way, so it reads both rather than
// making the callers convert.
const CLOUD_BOARDS = [{ id: 'gm_1', link_group_id: 'link_party' }];
const CLOUD_ENCOUNTERS = [
  { id: 'enc_1', link_group_id: 'link_party' },
  { id: 'enc_2', link_group_id: 'link_other' },
];

test('the builder of the board’s group is found in either spelling', () => {
  assert.equal(pickEncounterInstance(CLOUD_BOARDS, CLOUD_ENCOUNTERS, 'gm_1').id, 'enc_1');
  assert.equal(
    pickEncounterInstance(
      [{ id: 'gm_1', linkGroupId: 'link_party' }],
      [{ id: 'enc_1', linkGroupId: 'link_party' }],
      'gm_1',
    ).id,
    'enc_1',
  );
});

// Choosing between two for the GM is how a fight ends up in a file they never
// open, so two is the same answer as none.
test('two builders in one group is no answer at all', () => {
  const encounters = [
    { id: 'enc_1', link_group_id: 'link_party' },
    { id: 'enc_2', link_group_id: 'link_party' },
  ];
  assert.equal(pickEncounterInstance(CLOUD_BOARDS, encounters, 'gm_1'), null);
});

test('a board with no group, or no board at all, links to nothing', () => {
  assert.equal(pickEncounterInstance([{ id: 'gm_1' }], CLOUD_ENCOUNTERS, 'gm_1'), null);
  assert.equal(pickEncounterInstance(CLOUD_BOARDS, CLOUD_ENCOUNTERS, 'gm_missing'), null);
  assert.equal(pickEncounterInstance(CLOUD_BOARDS, CLOUD_ENCOUNTERS, ''), null);
  assert.equal(pickEncounterInstance(null, null, 'gm_1'), null);
});

test('an explicit destination resolves multiple linked builders without changing membership', () => {
  const encounters = [
    { id: 'enc_1', link_group_id: 'link_party' },
    { id: 'enc_2', linkGroupId: 'link_party' },
  ];
  assert.equal(pickEncounterInstanceInGroup(encounters, 'link_party', 'enc_2'), encounters[1]);
  assert.equal(pickEncounterInstanceInGroup(encounters, 'link_party'), null);
});

test('stale or unrelated destinations never silently fall back to another builder', () => {
  assert.equal(pickEncounterInstanceInGroup(CLOUD_ENCOUNTERS, 'link_party', 'enc_2'), null);
  assert.equal(pickEncounterInstanceInGroup(CLOUD_ENCOUNTERS, 'link_party', 'deleted'), null);
  assert.equal(pickEncounterInstanceInGroup(CLOUD_ENCOUNTERS, null, 'enc_1'), null);
  assert.equal(pickEncounterInstanceInGroup(CLOUD_ENCOUNTERS, 'link_party').id, 'enc_1');
});
