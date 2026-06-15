import { createAdapterBindings } from '../adapterBindings.js';

export default function install(registry, context = {}) {
  const {
    registerFeatAdapter,
    registerFeatSheetActions,
  } = createAdapterBindings(registry, context);

  // Ravenloft Dark Gift. Beast Sense and Speak with Animals (each free 1/LR) are
  // granted from the feat JSON additionalSpells; the adapter adds the
  // spellcasting-ability choice. Heightened Suspicion and Incessant Watchers are
  // passive.
  if (typeof registerFeatAdapter === 'function') {
    registerFeatAdapter('Watchers', function (feat) {
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
      };
    });
  }

  if (typeof registerFeatSheetActions === 'function') {
    registerFeatSheetActions('Watchers', [
      {
        name: 'Watchers',
        icon: 'eye',
        cat: 'action',
        uses: 'Passive',
        passive: true,
        desc: 'Borrowed Eyes: you always have Beast Sense and Speak with Animals prepared and can cast each without a spell slot once per Long Rest (or with slots you have). Heightened Suspicion: when you take the Search action, roll 1d4 and add it to any ability check made as part of that action. Incessant Watchers: Disadvantage on saves against Scrying; after you roll a 1 on a D20 Test, make a DC 13 + PB Wisdom save or have Disadvantage on D20 Tests for 1 minute (repeat the save at the end of each of your turns).',
      },
    ]);
  }
}
