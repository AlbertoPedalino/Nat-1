import { createAdapterBindings } from '../../adapterBindings.js';

export default function install(registry, context = {}) {
  const {
    registerSubclassAdapter,
    registerSubclassRuntimeConfig,
    registerSubclassSheetActions,
    registerSubclassSheetResources,
    registerSubclassSheetEffects,
  } = createAdapterBindings(registry, context);

  registerSubclassAdapter('Rogue_Phantom', function () {});

  registerSubclassRuntimeConfig('Rogue_Phantom', {
    spellcasting: {
      ability: 'dex',
      alwaysKnownSpells: [
        {
          name: 'Speak with Dead',
          minLevel: 9,
          source: 'Voice of Death',
          sourceType: 'subclass',
          freeCast: { maxUses: 1, recharge: 'shortOrLongRest', canAlsoUseSlots: false },
          spellOverrides: { components: 'none' },
        },
      ],
    },
  });

  registerSubclassSheetActions('Rogue_Phantom', [
    {
      name: 'Wails from the Grave',
      cat: 'special',
      resKey: 'phantom_wails',
      minLevel: 3,
    },
    {
      name: 'Ghost Walk',
      cat: 'bonus',
      resKey: 'phantom_ghostwalk',
      minLevel: 13,
    },
  ]);

  registerSubclassSheetResources('Rogue_Phantom', [
    {
      key: 'phantom_wails',
      name: 'Wails from the Grave',
      recharge: 'LR',
      minLevel: 3,
      max: 'abilityMod:dex', minMax: 1,
    },
    {
      key: 'phantom_trinkets',
      name: 'Soul Trinkets',
      recharge: 'LR',
      minLevel: 9,
      max: (lv) => (lv >= 17 ? 4 : lv >= 13 ? 3 : 2),
    },
    {
      key: 'phantom_ghostwalk',
      name: 'Ghost Walk',
      recharge: 'LR',
      minLevel: 13,
      max: 1,
    },
  ]);

}
