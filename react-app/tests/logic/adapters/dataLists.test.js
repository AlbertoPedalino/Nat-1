import test from 'node:test';
import assert from 'node:assert/strict';
import { createAdapterRegistry } from '../../../src/adapters/registry.js';
import installDragonborn from '../../../src/adapters/species/dragonborn.js';
import installWeaponMaster from '../../../src/adapters/feats/weapon-master.js';

test('Dragonborn ancestries come from the species data, once each, with their damage type', () => {
  const registry = createAdapterRegistry();
  installDragonborn(registry);
  const species = { _versions: [{ _abstract: {}, _implementations: [
    { _variables: { color: 'Black', damageType: 'Acid' } },
    { _variables: { color: 'Red', damageType: 'Fire' } },
  ] }] };
  const [spec] = registry.getSpeciesAdapter('Dragonborn', 'XPHB')(species);
  assert.deepEqual(spec.options, [
    { key: 'Black', label: 'Black (Acid)' },
    { key: 'Red', label: 'Red (Fire)' },
  ]);
});

test('Weapon Master offers the weapons of the item data that have a mastery', () => {
  const registry = createAdapterRegistry();
  installWeaponMaster(registry);
  const items = [
    { name: 'Longsword', type: 'M', weaponCategory: 'martial', mastery: ['Sap|XPHB'], source: 'XPHB' },
    { name: 'Torch', type: 'G', source: 'XPHB' },
  ];
  const feat = registry.getFeatAdapter('Weapon Master')({ name: 'Weapon Master' }, { items });
  assert.deepEqual(feat.choiceUi.weaponMastery.weapons, ['Longsword']);
});
