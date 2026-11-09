import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCompendiumIndex } from '../../../../../src/pages/compendium/search/compendiumIndex.js';
import { catalogEntries, runCatalog } from '../../../../../src/pages/compendium/catalogs/catalogFilter.js';
import {
  EQUIPMENT_CATALOG,
  MAGIC_ITEM_CATALOG,
  equipmentCategory,
  formatCostCell,
  itemAttributes,
  magicBonus,
  magicItemType,
} from '../../../../../src/pages/compendium/catalogs/itemCatalog.js';
import { attunementRequirementText } from '../../../../../src/shared/character/inventory/itemAttunement.js';

const index = buildCompendiumIndex({
  item: [
    { name: 'Longsword', source: 'XPHB', type: 'M', rarity: 'none', weaponCategory: 'martial', value: 1500, weight: 3, dmg1: '1d8', dmgType: 'S', property: ['V'], dmg2: '1d10', mastery: ['Sap'] },
    { name: 'Rope', source: 'XPHB', type: 'G', rarity: 'none', value: 100, weight: 5 },
    { name: 'Plate Armor', source: 'XPHB', type: 'HA', rarity: 'none', value: 150000, weight: 65, ac: 18 },
    { name: 'Longsword +1', source: 'XDMG', type: 'M', rarity: 'uncommon', bonusWeapon: '+1' },
    { name: 'Bag of Holding', source: 'XDMG', type: 'G', wondrous: true, rarity: 'uncommon' },
    { name: 'Wand of Fireballs', source: 'XDMG', type: 'WD', rarity: 'rare', reqAttune: 'by a spellcaster', charges: 7 },
    { name: 'Vorpal Sword', source: 'XDMG', type: 'M', rarity: 'legendary', reqAttune: true, bonusWeapon: '+3' },
  ],
});

test('magic items and equipment are the compendium items split by rarity', () => {
  assert.deepEqual(catalogEntries(MAGIC_ITEM_CATALOG, index).map((entry) => entry.name), ['Bag of Holding', 'Longsword +1', 'Vorpal Sword', 'Wand of Fireballs']);
  assert.deepEqual(catalogEntries(EQUIPMENT_CATALOG, index).map((entry) => entry.name), ['Longsword', 'Plate Armor', 'Rope']);
});

test('magic item filters: type, rarity, attunement, bonus, charges, sort by rarity', () => {
  const magic = catalogEntries(MAGIC_ITEM_CATALOG, index);
  const names = (filters) => runCatalog(MAGIC_ITEM_CATALOG, magic, filters).map((entry) => entry.name);
  assert.deepEqual(names({ type: 'weapon' }), ['Longsword +1', 'Vorpal Sword']);
  assert.deepEqual(names({ type: 'wondrous' }), ['Bag of Holding']);
  assert.deepEqual(names({ rarity: 'rare' }), ['Wand of Fireballs']);
  assert.deepEqual(names({ attunement: 'yes' }), ['Vorpal Sword', 'Wand of Fireballs']);
  assert.deepEqual(names({ attunement: 'no' }), ['Bag of Holding', 'Longsword +1']);
  assert.deepEqual(names({ bonus: '3' }), ['Vorpal Sword']);
  assert.deepEqual(names({ charges: 'yes' }), ['Wand of Fireballs']);
  assert.deepEqual(names({ search: 'sword' }), ['Longsword +1', 'Vorpal Sword']);
  assert.deepEqual(names({ sort: 'rarity' }), ['Bag of Holding', 'Longsword +1', 'Wand of Fireballs', 'Vorpal Sword']);
  const wand = magic.find((entry) => entry.name === 'Wand of Fireballs').record;
  assert.deepEqual([magicItemType(wand), attunementRequirementText(wand), magicBonus(wand)], ['wand', 'Requires attunement by a spellcaster', null]);
});

test('equipment filters: category, value and weight ranges (as the item filters type them), sort by value', () => {
  const gear = catalogEntries(EQUIPMENT_CATALOG, index);
  const names = (filters) => runCatalog(EQUIPMENT_CATALOG, gear, filters).map((entry) => entry.name);
  assert.deepEqual(names({ category: 'armor' }), ['Plate Armor']);
  assert.deepEqual(names({ valueMin: '1', valueMax: '10' }), ['Rope']);
  assert.deepEqual(names({ valueMin: '10', valueMax: '100' }), ['Longsword']);
  assert.deepEqual(names({ weightMin: '20' }), ['Plate Armor']);
  assert.deepEqual(names({ weightMax: '4,5' }), ['Longsword'], 'a comma reads as a decimal point');
  assert.deepEqual(names({ sort: 'value' }), ['Rope', 'Longsword', 'Plate Armor']);
  const longsword = gear.find((entry) => entry.name === 'Longsword').record;
  assert.equal(equipmentCategory(longsword), 'weapon');
  assert.equal(formatCostCell(longsword.value), '15 gp');
  assert.equal(formatCostCell(5), '5 cp');
  assert.deepEqual(itemAttributes(longsword), ['1d8 slashing', 'Versatile (1d10)', 'Mastery: Sap']);
});
