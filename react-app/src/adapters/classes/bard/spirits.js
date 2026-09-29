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
      icon: 'ghost',
      cat: 'bonus',
      uses: 'Bardic Inspiration',
      minLevel: 3,
    },
    {
      name: 'Spiritual Manifestation',
      icon: 'shield',
      cat: 'special',
      uses: '1 / SR or LR',
      resKey: 'spirits_manifestation_cover',
      minLevel: 6,
    },
  ]);

  registerSubclassSheetResources('Bard_Spirits', [
    {
      key: 'spirits_manifestation_cover',
      name: 'Spiritual Manifestation',
      icon: 'shield',
      recharge: 'SR+LR',
      minLevel: 6,
      max: 1,
    },
  ]);

  registerSubclassSheetProficiencies('Bard_Spirits', [
    { type: 'tool', values: ['Playing Card Set'], minLevel: 3 },
  ]);

  registerSubclassSheetEffects('Bard_Spirits', [
    {
      type: 'reminder',
      minLevel: 6,
      note: 'Spiritual Manifestation: you always have Spirit Guardians prepared and can cast it once per Long Rest without a slot. When you cast it, you can have it also grant you and allies in its Emanation Half Cover (once per Short or Long Rest).',
    },
    {
      type: 'reminder',
      minLevel: 14,
      note: 'Mystical Connection: when you roll on the Spirits from Beyond table, roll twice and choose which effect to bestow. On a tie, choose any effect on the table.',
    },
  ]);
}
