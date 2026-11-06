import test from 'node:test';
import assert from 'node:assert/strict';
import { createAdapterRegistry, KEYED_SLOTS } from '../../../src/adapters/registry.js';
import { createAdapterBindings } from '../../../src/adapters/adapterBindings.js';

test('every keyed slot has a register and a get for each of its kinds', () => {
  const registry = createAdapterRegistry();
  KEYED_SLOTS.forEach((slot) => slot.kinds.forEach((kind) => {
    assert.equal(typeof registry[`register${kind}${slot.register}`], 'function', `register${kind}${slot.register}`);
    assert.equal(typeof registry[`get${kind}${slot.get}`], 'function', `get${kind}${slot.get}`);
  }));
});

test('class and feat entries are found by name in any case; subclasses also by alias', () => {
  const registry = createAdapterRegistry();
  const actions = [{ name: 'Second Wind' }];
  registry.registerClassSheetActions('Fighter', actions);
  assert.equal(registry.getClassSheetActions('fighter'), actions);

  const adapter = () => null;
  registry.registerSubclassAdapter('Wizard', 'Evoker', adapter);
  assert.equal(registry.getSubclassAdapter('Wizard', 'School of Evocation'), adapter);
  assert.equal(registry.getSubclassAdapter('Wizard', 'Diviner'), null);
});

test('runtime configs merge and feature filters append, both on the exact owner', () => {
  const registry = createAdapterRegistry();
  registry.registerClassRuntimeConfig('Druid', { wildShape: { uses: 2 } });
  registry.registerClassRuntimeConfig('Druid', { wildShape: { beasts: true } });
  assert.deepEqual(registry.getClassRuntimeConfig('Druid'), { wildShape: { uses: 2, beasts: true } });

  const first = () => true;
  const second = () => false;
  registry.registerSpeciesSheetFeatureFilter('Elf', 'XPHB', first);
  registry.registerSpeciesSheetFeatureFilter('Elf', 'XPHB', second);
  registry.registerSpeciesSheetFeatureFilter('Elf', 'XPHB', 'not a function');
  assert.deepEqual(registry.getSpeciesSheetFeatureFilters('Elf', 'XPHB'), [first, second]);
});

test('an empty result is a fresh value each time', () => {
  const registry = createAdapterRegistry();
  const empty = registry.getFeatSheetActions('Alert');
  empty.push({ name: 'stray' });
  assert.deepEqual(registry.getFeatSheetActions('Alert'), []);
  assert.deepEqual(registry.getClassRuntimeConfig('Bard'), {});
  assert.equal(registry.getClassAtWillSpells('Bard'), null);
  assert.equal(registry.getSpeciesSheetHpBonus('Dwarf', 'XPHB'), 0);
});

test('bindings split a subclass or species raw key; class and feat registers pass through', () => {
  const registry = createAdapterRegistry();
  const bindings = createAdapterBindings(registry);
  bindings.registerSubclassSheetResources('Fighter_Battle Master', [{ key: 'dice' }]);
  bindings.registerSpeciesLongRestGrants('Human_XPHB', { inspiration: true });
  bindings.registerFeatSheetEffects('Tough', [{ type: 'hp' }]);
  assert.deepEqual(registry.getSubclassSheetResources('Fighter', 'Battle Master'), [{ key: 'dice' }]);
  assert.deepEqual(registry.getSpeciesLongRestGrants('Human', 'XPHB'), { inspiration: true });
  assert.deepEqual(registry.getFeatSheetEffects('Tough'), [{ type: 'hp' }]);
});
