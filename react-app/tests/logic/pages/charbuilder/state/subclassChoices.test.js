import test from 'node:test';
import assert from 'node:assert/strict';
import { handleExtraSubclassSelect, handleSubclassSelect } from '../../../../../src/pages/charbuilder/state/classHandlers.js';

// Changing a subclass drops the picks that subclass owns, and only those: the
// background's, the species' and the class's own skill picks stay.
const updateCharacter = (state, patch) => ({ ...state, character: { ...state.character, ...patch } });
const lore = { name: 'Bonus Proficiencies', subclassShortName: 'Lore', level: 3 };
const kept = {
  bg_skill_0: ['Insight'],
  species_skill_0: ['Perception'],
  class_skill_0: ['Athletics'],
  auto_feat_exp_Expertise_0: ['Stealth'],
};

test('the primary subclass change keeps every pick the subclass does not own', () => {
  const state = {
    character: {
      subclassShortName: 'Lore',
      allSubFeatures: [lore],
      choices: { ...kept, subclass_lore_bonus_skill_0: ['Arcana'], auto_feat_Bonus_Proficiencies_skill_0: ['History'] },
    },
  };
  const next = handleSubclassSelect(state, { subclassShortName: 'Valor' }, { updateCharacter });
  assert.deepEqual(next.character.choices, kept);
});

test('an extra class subclass change drops only that tab subclass picks', () => {
  const state = {
    character: {
      extraClasses: [{ name: 'Bard', subclassShortName: 'Lore', allSubFeatures: [lore], subclasses: [] }],
      choices: { ...kept, mc0_class_skill_0: ['Acrobatics'], mc0_auto_feat_Bonus_Proficiencies_skill_0: ['History'] },
    },
  };
  const next = handleExtraSubclassSelect(state, { index: 0, subclassShortName: 'Valor' }, { updateCharacter });
  assert.deepEqual(next.character.choices, { ...kept, mc0_class_skill_0: ['Acrobatics'] });
});
