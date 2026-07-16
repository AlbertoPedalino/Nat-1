import test from 'node:test';
import assert from 'node:assert/strict';
import {
  drainSpellSlotLevel,
  itemChargeCurrent,
  pruneReplicatedItemsForPlans,
  rechargeReplicatedItem,
  replaceReplicatedItem,
  replicatedNonArmorCount,
  setReplicatedItemCharges,
} from './magicItemTinker.js';

const replicated = (craftedFrom, extra = {}) => ({
  name: craftedFrom,
  source: 'XDMG',
  type: 'W',
  rarity: 'uncommon',
  qty: 1,
  flags: ['replicated'],
  craftedFrom,
  ...extra,
});

test('replaced plans immediately prune only their replicated items', () => {
  const mundane = { name: 'Rope', flags: [] };
  const inventory = [replicated('keep'), replicated('replace'), mundane];
  assert.deepEqual(pruneReplicatedItemsForPlans(inventory, ['keep']), [inventory[0], mundane]);
  assert.equal(pruneReplicatedItemsForPlans(inventory, ['keep', 'replace']), inventory);
});

test('charge helpers clamp current charges and recharge by slot level', () => {
  const item = replicated('wand', { charges: 7, chargesCurrent: 2 });
  const spent = setReplicatedItemCharges([item], 'wand', -10);
  assert.equal(itemChargeCurrent(spent[0]), 0);
  const charged = rechargeReplicatedItem(spent, 'wand', 3);
  assert.equal(itemChargeCurrent(charged[0]), 3);
  assert.equal(itemChargeCurrent(rechargeReplicatedItem(charged, 'wand', 99)[0]), 7);
});

test('Drain Magic Item maps supported rarity to the correct temporary slot', () => {
  assert.equal(drainSpellSlotLevel({ rarity: 'common' }), 1);
  assert.equal(drainSpellSlotLevel({ rarity: 'uncommon' }), 2);
  assert.equal(drainSpellSlotLevel({ rarity: 'rare' }), 2);
  assert.equal(drainSpellSlotLevel({ rarity: 'very rare' }), 0);
  assert.equal(drainSpellSlotLevel({ rarity: 'varies' }), 0);
});

test('transmutation preserves provenance but resets equipment and attunement', () => {
  const before = replicated('old-plan', { equipped: true, attuned: true, carried: false });
  const target = { name: 'New Wand', source: 'XDMG', type: 'WD', rarity: 'uncommon', charges: 5 };
  const next = replaceReplicatedItem([before], 'old-plan', 'new-plan', target);
  assert.equal(next[0].name, 'New Wand');
  assert.equal(next[0].craftedFrom, 'new-plan');
  assert.equal(next[0].equipped, false);
  assert.equal(next[0].attuned, false);
  assert.equal(next[0].carried, false);
  assert.equal(next[0].chargesCurrent, 5);
});

test('Armorer bonus-cap validation counts only replicated non-Armor items', () => {
  const inventory = [
    replicated('wand'),
    replicated('shield', { type: 'S' }),
    { name: 'Normal Sword', type: 'M', flags: [] },
  ];
  assert.equal(replicatedNonArmorCount(inventory), 1);
});
