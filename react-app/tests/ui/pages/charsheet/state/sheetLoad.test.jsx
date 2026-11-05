import { expect, test } from 'vitest';
import { adapterRegistry } from '../../../../../src/adapters/registry.js';
import { initialSheetResources, reconcileLoadedCharacter } from '../../../../../src/pages/charsheet/state/sheetLoad.js';

test('an unchanged inventory is not reported as a change; the optional-feature catalog is attached', () => {
  const ch = { name: 'Hero', inventory: [{ name: 'Rope', qty: 1 }] };
  const catalog = [{ name: 'Agonizing Blast', source: 'XPHB' }];
  const { character, inventoryChanged } = reconcileLoadedCharacter(ch, [], catalog);
  expect(inventoryChanged).toBe(false);
  expect(character.inventory).toEqual(ch.inventory);
  expect(character.optionalFeatureEntries).toBe(catalog);
});

test('a character without inventory loads as it is', () => {
  const ch = { name: 'Hero' };
  expect(reconcileLoadedCharacter(ch, [], [])).toEqual({ character: ch, inventoryChanged: false });
});

test('resources start full when new and are clamped to the current max when stored', () => {
  adapterRegistry.registerClassSheetResources('TestClass', [
    { key: 'test_pool', name: 'Test Pool', recharge: 'LR', max: () => 3 },
    { key: 'test_spent', name: 'Test Spent', recharge: 'LR', track: 'used', max: () => 5 },
  ]);
  const fresh = initialSheetResources({ className: 'TestClass', classLevel: 1, level: 1 });
  expect(fresh.resources).toMatchObject({ test_pool: 3, test_spent: 0 });
  expect(fresh.changed).toBe(true);

  const stored = initialSheetResources({
    className: 'TestClass', classLevel: 1, level: 1, resources: { test_pool: 9, test_spent: 2 },
  });
  expect(stored.resources).toMatchObject({ test_pool: 3, test_spent: 2 });
  expect(stored.changed).toBe(true);

  const unchanged = initialSheetResources({
    className: 'TestClass', classLevel: 1, level: 1, resources: { test_pool: 1, test_spent: 2 },
  });
  expect(unchanged.changed).toBe(false);
});
