import test from 'node:test';
import assert from 'node:assert/strict';
import { itemGroupLookup, itemImageMap, itemPicture } from '../../../../../src/pages/compendium/data/itemPictures.js';

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

test('pictures never come from an older edition, not even through a copy, a group or a base item', () => {
  const images = itemImageMap({
    itemFluff: [
      { name: 'Cloak of Invisibility', source: 'DMG', images: [{ href: { path: 'items/DMG/Cloak of Invisibility.webp' } }] },
      { name: 'Copied Cloak', source: 'XDMG', _copy: { name: 'Cloak of Invisibility', source: 'DMG' } },
      { name: 'Old Belts', source: 'DMG', images: [{ href: { path: 'items/DMG/Belts.webp' } }] },
      { name: 'Longsword', source: 'PHB', images: [{ href: { path: 'items/PHB/Longsword.webp' } }] },
    ],
  }, 'https://img.test/');
  assert.equal(images.size, 0);
  assert.equal(images.get('Cloak of Invisibility', 'DMG'), null);
  assert.equal(images.get('Copied Cloak', 'XDMG'), null, 'a 2024 entry copying a 2014 picture gets none');
  const groupOf = itemGroupLookup([{ name: 'Old Belts', source: 'DMG', items: ['Some Belt|XDMG'] }]);
  assert.equal(itemPicture({ name: 'Some Belt', source: 'XDMG' }, images, groupOf), null);
  assert.equal(itemPicture({ name: 'Longsword +1', source: 'XDMG', baseItem: 'longsword|phb' }, images, groupOf), null);
});
