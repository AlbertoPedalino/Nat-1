import test from 'node:test';
import assert from 'node:assert/strict';
import { offeredFilters } from '../../../../src/shared/content/filterFields.js';

const campaign = { kind: 'select', key: 'campaign', label: 'Campaign', options: [{ key: 'c1', label: 'Tavern' }] };
const bound = { kind: 'select', key: 'from', label: 'From', single: true, options: [{ key: '1', label: '1' }] };
const range = { kind: 'range', key: 'cr', label: 'CR', valueOf: () => 0 };

test('a choice no longer offered stops filtering', () => {
  const filters = offeredFilters([campaign, bound, range], {
    campaign: ['c1', 'gone'], from: 'gone', crMin: '2', crMax: '',
  });
  assert.deepEqual(filters, { campaign: ['c1'], from: 'all', crMin: '2', crMax: '' });
});

test('offered choices are kept as chosen', () => {
  assert.deepEqual(offeredFilters([campaign, bound], { campaign: ['c1'], from: '1' }), { campaign: ['c1'], from: '1' });
});

test('a group field offers each group, and "none" only while some record is in none', async () => {
  const { groupField, matchesFields, fieldOptions, NO_GROUP } = await import('../../../../src/shared/content/filterFields.js');
  const field = groupField({
    key: 'quest', label: 'Quest', noneLabel: 'No quest',
    groups: () => [{ key: 'none', label: 'none' }],
    groupsOf: (record) => record.quest,
  });
  const quested = [{ quest: 'none' }];
  assert.deepEqual(fieldOptions(field, quested).map((option) => option.key), ['none']);
  const mixed = [{ quest: 'none' }, { quest: '' }];
  assert.deepEqual(fieldOptions(field, mixed).map((option) => option.key), ['none', NO_GROUP]);
  // A quest named "none" is a quest, not the records in none.
  assert.equal(matchesFields([field], { quest: ['none'] }, { quest: 'none' }), true);
  assert.equal(matchesFields([field], { quest: ['none'] }, { quest: '' }), false);
  assert.equal(matchesFields([field], { quest: [NO_GROUP] }, { quest: '' }), true);
});

test('the quest filter reads quests trimmed, in text order', async () => {
  const { questFilterField } = await import('../../../../src/shared/encounter/library.js');
  const { fieldOptions } = await import('../../../../src/shared/content/filterFields.js');
  const field = questFilterField((record) => record.quest);
  const options = fieldOptions(field, [{ quest: ' Winter ' }, { quest: 'Debts' }, { quest: 'Winter' }]);
  assert.deepEqual(options.map((option) => option.label), ['Debts', 'Winter']);
});
