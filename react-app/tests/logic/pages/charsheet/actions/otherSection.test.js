import test from 'node:test';
import assert from 'node:assert/strict';
import { adapterRegistry } from '../../../../../src/adapters/registry.js';
import installLivingShadow from '../../../../../src/adapters/feats/living-shadow.js';
import { collectAdapterActions, FILTERS, SECTION_DEFS } from '../../../../../src/pages/charsheet/actions/actionsTabLogic.js';

installLivingShadow(adapterRegistry);

test('no-action features (cat special) are listed in the Other section with their counter', () => {
  const character = { level: 4, choices: { feat_asi_lv4: 'Living Shadow' }, allFeatSnapshots: [{ name: 'Living Shadow' }] };
  const card = collectAdapterActions(character, {}).find((action) => action.name === 'Lengthened Strike');

  assert.equal(card?.cat, 'special');
  assert.equal(card.resKey, 'living_shadow_reach');
  assert.deepEqual(SECTION_DEFS.find((section) => section.cats.includes('special')), { key: 'special', title: 'Other', cats: ['special'] });
  assert.ok(FILTERS.includes('special'));
});
