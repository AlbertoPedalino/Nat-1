import test from 'node:test';
import assert from 'node:assert/strict';
import { createAdapterRegistry } from '../../../src/adapters/registry.js';

test('Psionic Strike and Hand of Harm roll a real formula: the die plus the ability modifier', async () => {
  const [{ default: installPsi }, { default: installMercy }] = await Promise.all([
    import('../../../src/adapters/classes/fighter/psi-warrior.js'),
    import('../../../src/adapters/classes/monk/mercy.js'),
  ]);
  const registry = createAdapterRegistry();
  installPsi(registry);
  installMercy(registry);
  const roller = (cls, sub, name) => registry.getSubclassSheetActions(cls, sub).find((a) => a.name === name).rollers[0];
  const character = { scoreMethod: 'manual', manualScores: { int: 16, wis: 14 } };
  assert.equal(roller('Fighter', 'Psi Warrior', 'Psionic Strike').formula({ character, ownerLevel: 5 }), '1d8+3');
  assert.equal(roller('Monk', 'Mercy', 'Hand of Harm').formula({ character, ownerLevel: 11 }), '1d10+2');
});
