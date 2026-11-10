import test from 'node:test';
import assert from 'node:assert/strict';
import {
  featSlotSpellAbility,
  spellAbilityChoiceKey,
  spellAbilityChoiceUi,
} from '../../../../../src/shared/character/spells/spellAbilityChoice.js';
import { createAdapterRegistry } from '../../../../../src/adapters/registry.js';
import { adaptFeatRecord } from '../../../../../src/adapters/adapterPipeline.js';
import installAllFeats from '../../../../../src/adapters/feats/all-feats.js';

test('the spellcasting ability pick comes from the feat data', () => {
  const feat = { name: 'Gathered Whispers', additionalSpells: [{ ability: { choose: ['int', 'wis', 'cha'] } }] };
  assert.deepEqual(spellAbilityChoiceUi(feat).options.map((o) => o.value), ['int', 'wis', 'cha']);
  assert.equal(spellAbilityChoiceUi({ additionalSpells: [{ ability: 'inherit' }] }), null);
  const registry = createAdapterRegistry();
  installAllFeats(registry);
  assert.equal(adaptFeatRecord(feat, registry).choiceUi.spellAbility.keySuffix, 'spell_ability');
});

test("a feat slot's spells use its pick, else the ability the feat increased", () => {
  assert.equal(spellAbilityChoiceKey('feat_asi_lv4'), 'feat_asi_lv4_spell_ability');
  assert.equal(featSlotSpellAbility({ feat_asi_lv4_spell_ability: ['wis'] }, 'feat_asi_lv4'), 'wis');
  // Ritual Caster (XPHB): the ability increased by the feat.
  assert.equal(featSlotSpellAbility({ feat_asi_lv4_asi: ['Intelligence'] }, 'feat_asi_lv4'), 'int');
  assert.equal(featSlotSpellAbility({}, 'feat_asi_lv4'), null);
});
