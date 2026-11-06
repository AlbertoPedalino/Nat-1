import test from 'node:test';
import assert from 'node:assert/strict';
import { createAdapterRegistry } from '../../../src/adapters/registry.js';
import installDhampir from '../../../src/adapters/species/dhampir.js';

function biteRoller() {
  const registry = createAdapterRegistry();
  installDhampir(registry);
  const bite = registry.getSpeciesSheetActions('Dhampir', 'RHW').find((action) => action.name === 'Vampiric Bite');
  return bite.rollers[0];
}

test('Vampiric Bite deals 1d4 plus the Constitution modifier', () => {
  const roller = biteRoller();
  const damage = (con) => roller.formula({ character: { scoreMethod: 'manual', manualScores: { con } } });
  assert.equal(damage(16), '1d4+3');
  assert.equal(damage(10), '1d4');
  assert.equal(damage(8), '1d4-1');
  assert.equal(roller.label({ formula: '1d4+3' }), '1d4+3 piercing');
});
