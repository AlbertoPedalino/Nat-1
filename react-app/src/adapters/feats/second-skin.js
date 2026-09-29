import { createAdapterBindings } from '../adapterBindings.js';

export default function install(registry, context = {}) {
  const {
    registerFeatAdapter,
    registerFeatSheetActions,
  } = createAdapterBindings(registry, context);

  // Ravenloft Dark Gift. Alter Self (free 1/LR, no Concentration when cast this
  // way) is granted from the feat JSON additionalSpells; the adapter adds the
  // spellcasting-ability choice. Involuntary Change is a passive reminder.
  if (typeof registerFeatAdapter === 'function') {
    registerFeatAdapter('Second Skin', function (feat) {
      return {
        ...feat,
        choiceUi: {
          ...(feat.choiceUi && typeof feat.choiceUi === 'object' ? feat.choiceUi : {}),
          spellAbility: {
            keySuffix: 'spell_ability',
            label: 'Spellcasting Ability',
            options: [
              { value: 'int', label: 'Intelligence' },
              { value: 'wis', label: 'Wisdom' },
              { value: 'cha', label: 'Charisma' },
            ],
          },
        },
        spellGrantOverrides: {
          'Alter Self': {
            freeCast: { canAlsoUseSlots: true },
            modifiers: [{
              key: 'second-skin-no-concentration',
              tagLabel: 'Free Cast',
              detailTitle: 'Alternate Form',
              detailText: 'When cast without a spell slot through Second Skin, Alter Self requires no spell components or Concentration.',
            }],
          },
        },
      };
    });
  }

  if (typeof registerFeatSheetActions === 'function') {
    registerFeatSheetActions('Second Skin', []);
  }
}
