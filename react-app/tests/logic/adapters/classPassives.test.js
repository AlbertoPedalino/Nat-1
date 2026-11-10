import test from 'node:test';
import assert from 'node:assert/strict';
import { adapterRegistry } from '../../../src/adapters/registry.js';
import installBarbarian from '../../../src/adapters/classes/barbarian/barbarian.js';
import installMonk from '../../../src/adapters/classes/monk/monk.js';
import installRanger from '../../../src/adapters/classes/ranger/ranger.js';
import installRogue from '../../../src/adapters/classes/rogue/rogue.js';
import { getSpeedEffects } from '../../../src/shared/character/sheet/effectBonuses.js';
import { hasSaveProficiency } from '../../../src/shared/character/sheet/sheetStats.js';

installBarbarian(adapterRegistry);
installMonk(adapterRegistry);
installRanger(adapterRegistry);
installRogue(adapterRegistry);

const character = (className, level, inventory = []) => ({ className, classLevel: level, level, choices: {}, inventory });
const plate = { name: 'Plate Armor', type: 'HA', equipped: true };
const chain = { name: 'Chain Shirt', type: 'MA', equipped: true };
const shield = { name: 'Shield', type: 'S', equipped: true };

test('Fast Movement adds 10 ft from level 5, not in Heavy armor', () => {
  assert.equal(getSpeedEffects(character('Barbarian', 4)).bonus.walk, undefined);
  assert.equal(getSpeedEffects(character('Barbarian', 5)).bonus.walk, 10);
  assert.equal(getSpeedEffects(character('Barbarian', 5, [chain])).bonus.walk, 10);
  assert.equal(getSpeedEffects(character('Barbarian', 5, [plate])).bonus.walk, undefined);
});

test('Unarmored Movement grows with the Monk level, without armor or Shield', () => {
  assert.deepEqual([2, 6, 10, 14, 18].map((level) => getSpeedEffects(character('Monk', level)).bonus.walk), [10, 15, 20, 25, 30]);
  assert.equal(getSpeedEffects(character('Monk', 6, [shield])).bonus.walk, undefined);
});

test('Roving gives 10 ft and Climb and Swim Speeds equal to Speed', () => {
  const speed = getSpeedEffects(character('Ranger', 6));
  assert.equal(speed.bonus.walk, 10);
  assert.deepEqual([...speed.walkingModes].sort(), ['climb', 'swim']);
  assert.equal(getSpeedEffects(character('Ranger', 6, [plate])).walkingModes.size, 0);
});

test('Slippery Mind and Disciplined Survivor give their saving throw proficiencies', () => {
  assert.equal(hasSaveProficiency(character('Rogue', 14), 'wis'), false);
  assert.equal(hasSaveProficiency(character('Rogue', 15), 'cha'), true);
  assert.equal(hasSaveProficiency(character('Monk', 14), 'int'), true);
});

test('Primal Champion and Body and Mind raise their scores by 4, to a maximum of 25', async () => {
  const { abilityScore, abilityScoreBonuses } = await import('../../../src/shared/character/progression/abilityScores.js');
  const scores = (className, level, manualScores) => ({ ...character(className, level), scoreMethod: 'manual', manualScores });
  const barbarian = scores('Barbarian', 20, { str: 20, con: 23, dex: 14 });
  assert.equal(abilityScore(scores('Barbarian', 19, { str: 20 }), 'str'), 20);
  assert.equal(abilityScore(barbarian, 'str'), 24);
  assert.equal(abilityScore(barbarian, 'con'), 25);
  assert.equal(abilityScore(barbarian, 'dex'), 14);
  assert.deepEqual(abilityScoreBonuses(barbarian, 'con'), [{ source: 'Primal Champion', value: 2 }]);
  assert.equal(abilityScore(scores('Monk', 20, { wis: 18 }), 'wis'), 22);
});
