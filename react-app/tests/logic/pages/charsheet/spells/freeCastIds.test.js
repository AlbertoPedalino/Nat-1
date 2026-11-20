import test from 'node:test';
import assert from 'node:assert/strict';
import { adapterRegistry } from '../../../../../src/adapters/registry.js';
import installRuntimeConfig from '../../../../../src/adapters/classes/runtime-config.js';
import { collectAutoGrantedSpells } from '../../../../../src/pages/charsheet/spells/grantedSpells.js';
import { getFreeCastDefsForCharacter } from '../../../../../src/pages/charsheet/spells/spellFreeCastDefs.js';

installRuntimeConfig(adapterRegistry);

// A free cast is spent from the spell row and recovered by a rest: both must
// name it with the same id, or the rest never gives it back.
function ids(C) {
  const shown = collectAutoGrantedSpells(C).flatMap((spell) => (spell.freeCasts || []).map((fc) => fc.id)).sort();
  const rested = getFreeCastDefsForCharacter(C).map((fc) => fc.id).sort();
  return { shown, rested };
}

test('a subclass data spell cast once a day is the same free cast on its row and on a rest', () => {
  const C = {
    className: 'Bard', classLevel: 6, level: 6, subclassShortName: 'Spirits',
    allSubFeatures: [{ name: 'Guiding Whispers', subclassShortName: 'Spirits', subclassName: 'College of Spirits', level: 3 }],
    subclassAdditionalSpells: [{ prepared: { 6: { daily: { '1': ['spirit guardians|xphb'] } } } }],
  };
  const { shown, rested } = ids(C);
  assert.ok(shown.length > 0);
  assert.deepEqual(rested, shown);
});

test('class free casts (Divine Smite, Find Steed) are the same on their row and on a rest', () => {
  const C = { className: 'Paladin', classLevel: 5, level: 5 };
  const { shown, rested } = ids(C);
  assert.deepEqual(shown, ['class|faithful-steed|find-steed', 'paladin-paladins-smite-divine-smite']);
  assert.deepEqual(rested, shown);
});
