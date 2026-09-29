import test from 'node:test';
import assert from 'node:assert/strict';
import { adapterRegistry } from '../../../src/adapters/registry.js';
import installTelepathic from '../../../src/adapters/feats/telepathic.js';
import { collectSenses } from '../../../src/pages/charsheet/stats/visionSenses.js';

installTelepathic(adapterRegistry);

test('Telepathic has no Detect Thoughts card or counter besides the spell free cast', () => {
  assert.deepEqual(adapterRegistry.getFeatSheetActions('Telepathic'), []);
  assert.deepEqual(adapterRegistry.getFeatSheetResources('Telepathic'), []);
});

test('Telepathic shows 60 ft telepathy under senses', () => {
  const character = { level: 4, choices: { feat_asi_lv4: 'Telepathic' } };
  const telepathy = collectSenses(character).vision.find((sense) => sense.type === 'telepathy');

  assert.equal(telepathy?.range, 60);
});
