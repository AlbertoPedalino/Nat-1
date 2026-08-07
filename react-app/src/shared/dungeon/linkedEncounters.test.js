import test from 'node:test';
import assert from 'node:assert/strict';
import { pickEncounterInstance } from './linkedEncounters.js';

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
