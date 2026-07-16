import test from 'node:test';
import assert from 'node:assert/strict';
import {
  REPLICATE_BUCKETS,
  applyReplicateItemPlan,
  collectReplicatePlanChoices,
  isReplicateArmorItem,
  itemMatchesBucket,
} from './replicateMagicItem.js';

const bucket = (id) => REPLICATE_BUCKETS.find((entry) => entry.id === id);

test('rarity buckets require exact concrete rarity and wondrous category', () => {
  const uncommon = bucket('uncommon-wondrous');
  assert.equal(itemMatchesBucket({ rarity: 'uncommon', wondrous: true }, uncommon), true);
  assert.equal(itemMatchesBucket({ rarity: 'uncommon', wondrous: false }, uncommon), false);
  assert.equal(itemMatchesBucket({ rarity: 'rare', wondrous: true }, uncommon), false);
  assert.equal(itemMatchesBucket({ rarity: 'varies', wondrous: true }, uncommon), false);
  assert.equal(itemMatchesBucket({ rarity: 'uncommon', wondrous: true, curse: true }, uncommon), false);
});

test('common bucket excludes potions, scrolls, and cursed items', () => {
  const common = bucket('common-any');
  assert.equal(itemMatchesBucket({ rarity: 'common', type: 'W', wondrous: true }, common), true);
  assert.equal(itemMatchesBucket({ rarity: 'common', type: 'P' }, common), false);
  assert.equal(itemMatchesBucket({ rarity: 'common', type: 'SC' }, common), false);
  assert.equal(itemMatchesBucket({ rarity: 'common', type: 'W', curse: true }, common), false);
});

test('Armorer Armor category includes shields but excludes weapons', () => {
  assert.equal(isReplicateArmorItem({ type: 'LA' }), true);
  assert.equal(isReplicateArmorItem({ type: 'S|XPHB' }), true);
  assert.equal(isReplicateArmorItem({ name: 'Armor of Resistance', type: 'GV|XDMG' }), true);
  assert.equal(isReplicateArmorItem({ type: 'M' }), false);
});

test('collectReplicatePlanChoices includes base, Armorer, and multiclass plans', () => {
  const character = {
    className: 'Artificer',
    subclassShortName: 'Armorer',
    level: 9,
    choices: {
      artificer_replicate_magic_item_plans: ['base-a', 'base-b'],
      armorer_replicate_magic_item_armor_plan: 'armor-a',
      mc0_artificer_replicate_magic_item_plans: ['multi-a'],
      unrelated: 'ignored',
    },
  };
  assert.deepEqual(collectReplicatePlanChoices(character), ['base-a', 'base-b', 'armor-a', 'multi-a']);
});

test('stale Armorer bonus plan is ignored after leaving the subclass', () => {
  const character = {
    className: 'Artificer',
    subclassShortName: 'Artillerist',
    level: 10,
    choices: {
      artificer_replicate_magic_item_plans: ['base-a'],
      armorer_replicate_magic_item_armor_plan: 'stale-armor',
    },
  };
  assert.deepEqual(collectReplicatePlanChoices(character), ['base-a']);
});

test('Repeating Shot and Returning Weapon resolve as Uncommon items', () => {
  const weapon = { name: 'Light Crossbow', source: 'XPHB', type: 'R', rarity: 'none' };
  assert.equal(applyReplicateItemPlan(weapon, bucket('repeating-shot')).rarity, 'uncommon');
  assert.equal(applyReplicateItemPlan(weapon, bucket('returning-weapon')).rarity, 'uncommon');
});
