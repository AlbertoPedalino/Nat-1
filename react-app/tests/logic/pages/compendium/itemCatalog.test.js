import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCompendiumIndex } from '../../../../src/pages/compendium/compendiumIndex.js';
import {
  attunementText,
  catalogEntries,
  equipmentCategory,
  filterEquipment,
  filterMagicItems,
  formatCost,
  itemAttributes,
  itemGroupLookup,
  itemImageMap,
  itemPicture,
  magicBonus,
  magicItemType,
} from '../../../../src/pages/compendium/itemCatalog.js';

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
  assert.deepEqual(catalogEntries(index, true).map((entry) => entry.name), ['Bag of Holding', 'Longsword +1', 'Vorpal Sword', 'Wand of Fireballs']);
  assert.deepEqual(catalogEntries(index, false).map((entry) => entry.name), ['Longsword', 'Plate Armor', 'Rope']);
});

test('magic item filters: type, rarity, attunement, bonus, charges, sort by rarity', () => {
  const magic = catalogEntries(index, true);
  const names = (filters) => filterMagicItems(magic, filters).map((entry) => entry.name);
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
  assert.deepEqual([magicItemType(wand), attunementText(wand), magicBonus(wand)], ['wand', 'Required by a spellcaster', null]);
});

test('equipment filters: category, cost, weight, sort by cost; rows show cost and attributes', () => {
  const gear = catalogEntries(index, false);
  const names = (filters) => filterEquipment(gear, filters).map((entry) => entry.name);
  assert.deepEqual(names({ category: 'armor' }), ['Plate Armor']);
  assert.deepEqual(names({ cost: '1to10' }), ['Rope']);
  assert.deepEqual(names({ cost: '10to100' }), ['Longsword']);
  assert.deepEqual(names({ weight: 'over20' }), ['Plate Armor']);
  assert.deepEqual(names({ sort: 'cost' }), ['Rope', 'Longsword', 'Plate Armor']);
  const longsword = gear.find((entry) => entry.name === 'Longsword').record;
  assert.equal(equipmentCategory(longsword), 'weapon');
  assert.equal(formatCost(longsword.value), '15 gp');
  assert.equal(formatCost(5), '5 cp');
  assert.deepEqual(itemAttributes(longsword), ['1d8 Slashing', 'Versatile (1d10)', 'Mastery: Sap']);
});

test('item pictures come from the fluff file, following copies', () => {
  const images = itemImageMap({
    itemFluff: [
      { name: 'Bag of Holding', source: 'XDMG', images: [{ type: 'image', href: { type: 'internal', path: 'items/XDMG/Bag of Holding.webp' } }] },
      { name: 'Aquatic Weapon', source: 'AU', _copy: { name: 'Bag of Holding', source: 'XDMG' } },
      { name: 'Plain Thing', source: 'XPHB', entries: ['No picture.'] },
    ],
  }, 'https://img.test/');
  assert.equal(images.get('Bag of Holding', 'XDMG'), 'https://img.test/items/XDMG/Bag%20of%20Holding.webp');
  assert.equal(images.get('aquatic weapon', 'au'), 'https://img.test/items/XDMG/Bag%20of%20Holding.webp');
  assert.equal(images.get('Plain Thing', 'XPHB'), null);
});

test('an item without a picture of its own shows its group’s, or its base item’s', () => {
  const images = itemImageMap({
    itemFluff: [
      { name: 'Belt of Giant Strength', source: 'XDMG', images: [{ href: { path: 'items/XDMG/Belt of Giant Strength.webp' } }] },
      { name: 'Longsword', source: 'XPHB', images: [{ href: { path: 'items/XPHB/Longsword.webp' } }] },
    ],
  }, 'https://img.test/');
  const groupOf = itemGroupLookup([{ name: 'Belt of Giant Strength', source: 'XDMG', items: ['Belt of Cloud Giant Strength|XDMG'] }]);
  assert.equal(itemPicture({ name: 'Belt of Cloud Giant Strength', source: 'XDMG' }, images, groupOf),
    'https://img.test/items/XDMG/Belt%20of%20Giant%20Strength.webp');
  assert.equal(itemPicture({ name: 'Longsword +1', source: 'XDMG', baseItem: 'longsword|xphb' }, images, groupOf),
    'https://img.test/items/XPHB/Longsword.webp');
  assert.equal(itemPicture({ name: 'Potion of Hill Giant Strength', source: 'XDMG' }, images, groupOf), null);
  assert.equal(itemPicture({ name: 'Anything', source: 'XDMG' }, null), null, 'no pictures loaded');
});
