import test from 'node:test';
import assert from 'node:assert/strict';
import { serializeCharacterForExport } from '../../../../../src/pages/charbuilder/state/characterExport.js';

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
