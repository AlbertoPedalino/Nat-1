import test from 'node:test';
import assert from 'node:assert/strict';
import { featChoiceSpecs } from '../../../../../src/pages/charbuilder/choices/featChoiceSpecs.js';

// A feat's spell picks come from its additionalSpells "choose" items, one pick
// per mode and filter, with the count of the items it groups.
test('a feat offers one pick per spell choice in its data', () => {
  const feat = {
    name: 'Magic Initiate',
    additionalSpells: [{
      known: { _: [{ choose: 'level=0|class=Wizard', count: 2 }] },
      innate: { _: { daily: { 1: [{ choose: 'level=1|class=Wizard' }] } } },
    }],
  };
  const spells = featChoiceSpecs(feat, { slotKey: 'feat_origin' }).filter((spec) => spec.type === 'spell_choice');
  assert.deepEqual(spells.map((spec) => spec.key), [
    'feat_origin_spell_known_0_0|Wizard|',
    'feat_origin_spell_innate_1_1|Wizard|',
  ]);
  assert.equal(spells[0].count, 2);
  assert.equal(spells[0].label, 'Magic Initiate - Cantrip (Wizard)');
  assert.deepEqual(spells[1].spellFilter, { spellLevels: [1], classes: ['Wizard'], schools: undefined });
});

test('a feat with several spell lists offers picks only once one is chosen', () => {
  const feat = { name: 'Choice', additionalSpells: [{ known: { _: [{ choose: 'level=0' }] } }, { known: { _: [{ choose: 'level=1' }] } }] };
  assert.equal(featChoiceSpecs(feat, { slotKey: 's' }).filter((spec) => spec.type === 'spell_choice').length, 0);
  const picked = featChoiceSpecs(feat, { slotKey: 's', entryIdx: 1 }).filter((spec) => spec.type === 'spell_choice');
  assert.deepEqual(picked.map((spec) => spec.spellFilter.spellLevels), [[1]]);
});
