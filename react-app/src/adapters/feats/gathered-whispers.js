import { createAdapterBindings } from '../adapterBindings.js';

export default function install(registry, context = {}) {
  const { registerFeatAdapter, registerFeatSheetActions, registerFeatSheetResources } = createAdapterBindings(registry, context);

  // Ravenloft Dark Gift. Message (no Material components) and Augury (free 1/LR)
  // are granted from the feat JSON additionalSpells (its spellcasting-ability
  // pick too); the adapter wires Unearthly Scream's limited uses.
  registerFeatAdapter('Gathered Whispers', function (feat) {
    return {
      ...feat,
      spellGrantOverrides: {
        Message: {
          spell: { components: 'none' },
        },
        Augury: {
          freeCast: { canAlsoUseSlots: true },
          modifiers: [{
            key: 'gathered-whispers-free-components',
            tagLabel: 'Free Cast',
            detailTitle: 'Gathered Whispers',
            detailText: 'The once-per-Long-Rest casting requires no spell components.',
          }],
        },
      },
    };
  });

  registerFeatSheetActions('Gathered Whispers', [
    {
      name: 'Unearthly Scream',
      
      cat: 'reaction',
      
      resKey: 'gathered_whispers_scream',
    },
  ]);

  registerFeatSheetResources('Gathered Whispers', [
    {
      key: 'gathered_whispers_scream',
      name: 'Unearthly Scream',
      
      recharge: 'LR',
      max: 'proficiencyBonus',
    },
  ]);
}
