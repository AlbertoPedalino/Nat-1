import test from 'node:test';
import assert from 'node:assert/strict';
import { adapterRegistry } from '../../../../../src/adapters/registry.js';
import installChef from '../../../../../src/adapters/feats/chef.js';
import { collectAdapterActions } from '../../../../../src/shared/character/sheet/adapterActions.js';

installChef(adapterRegistry);

// A feat's card named after one of its benefits shows that benefit alone, the
// feat's own text around it kept — the same rule as "Feature: Option" cards.
const block = (name, text) => ({ type: 'entries', name, entries: [text] });
const chef = {
  name: 'Chef',
  source: 'XPHB',
  entries: [
    'You gain the following benefits.',
    block('Ability Score Increase', 'Increase your Constitution or Wisdom score by 1.'),
    block('Replenishing Meal', 'Extra Hit Points during a Short Rest.'),
    block('Bolstering Treats', 'Treats that grant Temporary Hit Points.'),
  ],
};

test('a feat card named after one benefit shows that benefit', () => {
  const character = { className: 'Fighter', level: 4, classLevel: 4, feats: ['Chef'], allFeatSnapshots: [chef], choices: {} };
  const treats = collectAdapterActions(character).find((action) => action.name === 'Bolstering Treats');
  assert.deepEqual(treats.entries, ['You gain the following benefits.', chef.entries[3]]);
});
