import { createAdapterBindings } from '../../adapterBindings.js';

export default function install(registry, context = {}) {
  const {
    registerSubclassAdapter,
    registerSubclassRuntimeConfig,
    registerSubclassSheetActions,
    registerSubclassSheetResources,
    registerSubclassSheetEffects,
    registerSubclassSheetProficiencies,
  } = createAdapterBindings(registry, context);

  registerSubclassAdapter('Bard_Spirits', function () {});

  registerSubclassRuntimeConfig('Bard_Spirits', {
    spellcasting: {
      ability: 'cha',
      alwaysKnownSpells: [
        {
          name: 'Guidance',
          minLevel: 3,
          source: 'Guiding Whispers',
          sourceType: 'subclass',
          spellOverrides: { rangeLabel: '60 feet' },
        },
      ],
      alwaysPreparedSpells: [
        {
          name: 'Spirit Guardians',
          minLevel: 6,
          source: 'Spiritual Manifestation',
          sourceType: 'subclass',
          freeCast: { maxUses: 1, recharge: 'longRest', canAlsoUseSlots: true },
          modifiers: [{
            key: 'spiritual-manifestation-cover',
            tagLabel: 'Half Cover',
            detailTitle: 'Spiritual Manifestation',
            detailText: 'Once per Short or Long Rest when you cast this spell, you and allies in its Emanation can gain Half Cover.',
          }],
        },
      ],
    },
  });

  registerSubclassSheetActions('Bard_Spirits', [
    {
      name: 'Spirits from Beyond',
      
      cat: 'bonus',
      
      minLevel: 3,
    },
    {
      name: 'Spiritual Manifestation',
      
      cat: 'special',
      
      resKey: 'spirits_manifestation_cover',
      minLevel: 6,
    },
  ]);

  registerSubclassSheetResources('Bard_Spirits', [
    {
      key: 'spirits_manifestation_cover',
      name: 'Spiritual Manifestation',
      
      recharge: 'SR+LR',
      minLevel: 6,
      max: 1,
    },
  ]);

  registerSubclassSheetProficiencies('Bard_Spirits', [
    { type: 'tool', values: ['Playing Card Set'], minLevel: 3 },
  ]);

}
