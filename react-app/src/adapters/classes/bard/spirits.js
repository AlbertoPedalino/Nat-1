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
      desc: 'When you give a creature a Bardic Inspiration die (Bonus Action), you can channel a random spirit (roll the Inspiration die and consult the Spirits from Beyond table). Controlled Channeling: as a Bonus Action you can expend a use of Bardic Inspiration to channel a specific spirit whose number is at most the highest face of your Inspiration die. As a Magic action, Unleash a channeled spirit at a creature within 30 ft (save DC = your Bard spell save DC).',
    },
    {
      name: 'Spiritual Manifestation',
      icon: 'shield',
      cat: 'special',
      uses: '1 / SR or LR',
      resKey: 'spirits_manifestation_cover',
      minLevel: 6,
      desc: 'When you cast Spirit Guardians, you can cause it to grant Half Cover to you and your allies while they are in its Emanation. Once per Short or Long Rest.',
    },
    {
      name: 'Power from Beyond',
      icon: 'sparkles',
      cat: 'special',
      uses: 'Passive',
      passive: true,
      minLevel: 6,
      desc: 'Once per turn, when you cast a Bard spell with a spell slot that deals damage or restores Hit Points, roll {@dice 1d6} and add it to one of the spell\'s damage rolls or to the total Hit Points restored.',
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
