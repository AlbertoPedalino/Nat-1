import { createAdapterBindings } from '../adapterBindings.js';

export default function install(registry, context = {}) {
  const {
    registerFeatAdapter,
    registerFeatSheetActions,
  } = createAdapterBindings(registry, context);

  // Ravenloft Dark Gift. Chill Touch (no components, Necrotic ignores Resistance)
  // is granted from the feat JSON additionalSpells; the adapter adds the
  // spellcasting-ability choice. Pull of the Grave is a passive drawback.
  if (typeof registerFeatAdapter === 'function') {
    registerFeatAdapter('Touch of Death', function (feat) {
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
          'Chill Touch': {
            spell: { components: 'none' },
            modifiers: [{
              key: 'touch-of-death-resistance',
              tagLabel: 'Ignore Resistance',
              detailTitle: 'Touch of Death',
              detailText: 'The spell\'s Necrotic damage ignores Resistance.',
            }],
          },
        },
      };
    });
  }

  if (typeof registerFeatSheetActions === 'function') {
    registerFeatSheetActions('Touch of Death', [
      {
        name: 'Touch of Death',
        icon: 'skull',
        cat: 'action',
        uses: 'Passive',
        passive: true,
        desc: 'You learn Chill Touch and can cast it without spell components; its Necrotic damage ignores Resistance. Pull of the Grave: you have Disadvantage on Death Saving Throws.',
      },
    ]);
  }
}
