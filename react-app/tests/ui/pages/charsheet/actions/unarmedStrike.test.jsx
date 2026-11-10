import { expect, test } from 'vitest';
import { adapterRegistry } from '../../../../../src/adapters/registry.js';
import installMonk from '../../../../../src/adapters/classes/monk/monk.js';
import installFightingStyles from '../../../../../src/adapters/feats/fighting-styles.js';
import installTavernBrawler from '../../../../../src/adapters/feats/tavern-brawler.js';
import { makeWeaponActions } from '../../../../../src/pages/charsheet/actions/weaponActions.js';
import { collectEquipmentProficiencySets } from '../../../../../src/shared/character/proficiency/equipmentSets.js';

installMonk(adapterRegistry);
installFightingStyles(adapterRegistry);
installTavernBrawler(adapterRegistry);

// STR 14 (+2), DEX 16 (+3).
const scores = { str: 14, dex: 16, con: 12, int: 10, wis: 10, cha: 10 };
const shield = { name: 'Shield', source: 'XPHB', type: 'S', equipped: true };

function unarmed(character, inventory = []) {
  const C = { scoreMethod: 'manual', manualScores: scores, ...character };
  const card = makeWeaponActions(C, inventory, inventory, [], collectEquipmentProficiencySets(C))
    .find((action) => action.name === 'Unarmed Strike');
  return { damage: card.rollers[0].formula };
}

test('without any feature: 1 + Strength', () => {
  expect(unarmed({ className: 'Fighter', classLevel: 1, level: 1 })).toEqual({ damage: '1+2' });
});

test('Martial Arts: the die grows with Monk level and uses Dexterity when higher', () => {
  const monk = (level) => unarmed({ className: 'Monk', classLevel: level, level }).damage;
  expect(monk(1)).toBe('1d6+3');
  expect(monk(4)).toBe('1d6+3');
  expect(monk(5)).toBe('1d8+3');
  expect(monk(11)).toBe('1d10+3');
  expect(monk(17)).toBe('1d12+3');
});

test('Martial Arts follows the Monk levels of a multiclass character', () => {
  const C = { className: 'Fighter', classLevel: 4, level: 9, extraClasses: [{ name: 'Monk', level: 5 }] };
  expect(unarmed(C).damage).toBe('1d8+3');
});

test('Unarmed Fighting: d8 with empty hands, d6 holding a Shield', () => {
  const C = { className: 'Fighter', classLevel: 1, level: 1, choices: { fighter_fighting_style: 'Unarmed Fighting' } };
  expect(unarmed(C).damage).toBe('1d8+2');
  expect(unarmed(C, [shield]).damage).toBe('1d6+2');
});

test('Tavern Brawler: d4, and the largest die wins when features stack', () => {
  expect(unarmed({ className: 'Fighter', classLevel: 1, level: 1, choices: { feat_origin: 'Tavern Brawler|XPHB' } }).damage).toBe('1d4+2');
  expect(unarmed({ className: 'Monk', classLevel: 1, level: 1, choices: { feat_origin: 'Tavern Brawler|XPHB' } }).damage).toBe('1d6+3');
});
