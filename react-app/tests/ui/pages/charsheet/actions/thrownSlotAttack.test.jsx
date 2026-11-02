import { expect, test } from 'vitest';
import { adapterRegistry } from '../../../../../src/adapters/registry.js';
import installFightingStyles from '../../../../../src/adapters/feats/fighting-styles.js';
import { makeWeaponActions } from '../../../../../src/pages/charsheet/actions/actionsTabLogic.js';
import { collectEquipmentProficiencySets } from '../../../../../src/pages/charsheet/proficiency/index.js';

installFightingStyles(adapterRegistry);

// A weapon readied to throw gets its own attack card, and counts as a second
// weapon only for itself: Dueling stays on the sword, not on the javelin.
const duelist = {
  className: 'Fighter',
  level: 1,
  scoreMethod: 'manual',
  manualScores: { str: 14, dex: 10, con: 12, int: 10, wis: 10, cha: 10 },
  clsSnapshot: { startingProficiencies: { weapons: ['simple', 'martial'] } },
  choices: { fighter_fighting_style: 'Dueling' },
};
const javelin = {
  name: 'Javelin', source: 'XPHB', type: 'M', weaponCategory: 'simple',
  property: ['T'], dmg1: '1d6', dmgType: 'P', qty: 5, equipped: true, equippedSlot: 'thrown',
};
const longsword = {
  name: 'Longsword', source: 'XPHB', type: 'M', weaponCategory: 'martial',
  property: ['V'], dmg1: '1d8', dmg2: '1d10', dmgType: 'S', equipped: true, equippedSlot: 'mainHand',
};

function damageByName(inventory) {
  const actions = makeWeaponActions(duelist, inventory, inventory, [], collectEquipmentProficiencySets(duelist));
  return Object.fromEntries(actions
    .filter((action) => action._source === 'Weapon')
    .map((action) => [action.name, action.rollers[0].formula]));
}

test('a readied javelin has its own card beside the sword, and Dueling stays on the sword', () => {
  expect(damageByName([longsword, javelin])).toEqual({
    Longsword: '1d8+4',
    Javelin: '1d6+2',
  });
});

test('a readied javelin alone is the only weapon in hand when thrown', () => {
  expect(damageByName([javelin])).toEqual({ Javelin: '1d6+4' });
});
