import test from 'node:test';
import assert from 'node:assert/strict';
import { adapterRegistry } from '../../../src/adapters/registry.js';
import installElements from '../../../src/adapters/classes/barbarian/elements.js';
import installShadow from '../../../src/adapters/classes/cleric/shadow.js';
import installSwashbuckler from '../../../src/adapters/classes/rogue/swashbuckler.js';
import { rageDamageBonus } from '../../../src/adapters/classes/barbarian/rageDamage.js';
import { collectOwnerEntries } from '../../../src/shared/character/sheet/adapterOwners.js';
import { collectInitiativeModifiers } from '../../../src/shared/character/sheet/sheetStats.js';

installElements(adapterRegistry);
installShadow(adapterRegistry);
installSwashbuckler(adapterRegistry);

const character = (className, subclassShortName, level, extra = {}) => ({
  className, classLevel: level, level, subclassShortName, choices: {}, ...extra,
});

test('Raging Elements dice follow the Rage Damage bonus', () => {
  assert.deepEqual([1, 9, 16].map(rageDamageBonus), [2, 3, 4]);
  const icefury = collectOwnerEntries(character('Barbarian', 'Elements', 9), 'SheetActions')
    .find(({ entry }) => entry.name === 'Icefury').entry;
  assert.equal(icefury.rollers[0].formula({ ownerLevel: 9 }), '3d8');
});

test('Icefury is a spell attack with Constitution, not Strength', () => {
  const C = character('Barbarian', 'Elements', 5, { scoreMethod: 'manual', manualScores: { str: 18, con: 14 } });
  const icefury = collectOwnerEntries(C, 'SheetActions').find(({ entry }) => entry.name === 'Icefury').entry;
  assert.equal(icefury.attackBonus({ character: C }), 2 + 3);
});

test('Primordial Bond resists only while raging', () => {
  const resist = (rageActive) => collectOwnerEntries(character('Barbarian', 'Elements', 10, { rageActive }), 'SheetEffects')
    .filter(({ entry }) => entry.type === 'resistance').length;
  assert.equal(resist(true), 1);
  assert.equal(resist(false), 0);
});

test('Shadow Domain features arrive at their levels', () => {
  const names = (level) => collectOwnerEntries(character('Cleric', 'Shadow', level), 'SheetActions').map(({ entry }) => entry.name);
  assert.deepEqual(names(3), ['Devouring Plague', 'Shadowform']);
  assert.ok(names(6).includes('Dispersion'));
});

test('Rakish Audacity adds the Charisma modifier to Initiative', () => {
  const C = character('Rogue', 'Swashbuckler', 3, { scoreMethod: 'manual', manualScores: { cha: 16 } });
  assert.equal(collectInitiativeModifiers(C).find((modifier) => modifier.source === 'Rakish Audacity')?.amount, 3);
});
