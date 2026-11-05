import test from 'node:test';
import assert from 'node:assert/strict';
import { serializeCharacterForExport } from '../../../../../src/pages/charbuilder/state/characterExport.js';
import { SYNCED_DATA_KEYS } from '../../../../../src/shared/character/combat/vitals.js';

test('an export keeps the state of class features in play (form, companions, cannons)', () => {
  const character = {
    name: 'Ranger', className: 'Ranger', currentHP: 30,
    wildShape: { beast: { name: 'Wolf' } },
    wildCompanion: { name: 'Owl' },
    eldritchCannons: [{ id: 'c1', type: 'Protector', hp: 7 }],
    primalCompanion: { beast: 'Beast of the Land', damageType: 'force', hpCurrent: 12 },
  };
  const out = serializeCharacterForExport(character);
  assert.deepEqual(out.wildShape, character.wildShape);
  assert.deepEqual(out.wildCompanion, character.wildCompanion);
  assert.deepEqual(out.eldritchCannons, character.eldritchCannons);
  assert.deepEqual(out.primalCompanion, character.primalCompanion);
});

test('an export keeps every synced vital, reminders included', () => {
  const character = {
    name: 'Cleric', currentHP: 4, tempHP: 2, maxHPBonus: 5,
    deathSaves: { success: 1, fail: 0 },
    activeConditions: ['poisoned'],
    activeEffects: [{ key: 'custom', text: 'Bless' }],
  };
  const out = serializeCharacterForExport(character);
  for (const key of SYNCED_DATA_KEYS) assert.deepEqual(out[key], character[key], key);
});
