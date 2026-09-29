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
      icon: 'ghost',
      cat: 'special',
      uses: 'DEX mod / LR',
      resKey: 'phantom_wails',
      minLevel: 3,
    },
    {
      name: 'Ghost Walk',
      icon: 'wind',
      cat: 'bonus',
      uses: '1 / LR',
      resKey: 'phantom_ghostwalk',
      minLevel: 13,
    },
  ]);

  registerSubclassSheetResources('Rogue_Phantom', [
    {
      key: 'phantom_wails',
      name: 'Wails from the Grave',
      icon: 'ghost',
      recharge: 'LR',
      minLevel: 3,
      max: (lv, mods) => Math.max(1, mods?.dex ?? 1),
    },
    {
      key: 'phantom_trinkets',
      name: 'Soul Trinkets',
      icon: 'gem',
      recharge: 'LR',
      minLevel: 9,
      max: (lv) => (lv >= 17 ? 4 : lv >= 13 ? 3 : 2),
    },
    {
      key: 'phantom_ghostwalk',
      name: 'Ghost Walk',
      icon: 'wind',
      recharge: 'LR',
      minLevel: 13,
      max: 1,
    },
  ]);

  registerSubclassSheetEffects('Rogue_Phantom', [
    {
      type: 'reminder',
      minLevel: 9,
      note: 'Tokens of the Departed: keep up to two soul trinkets (3 at level 13, 4 at level 17). Death\'s Knell: destroy a trinket on a Sneak Attack to use Wails from the Grave for free. Life Essence: while you have a trinket, Advantage on Death Saves and Constitution saves. Spirit Query: destroy a trinket (Magic action) to cast Augury (Constitution) or question the associated spirit.',
    },
    {
      type: 'reminder',
      minLevel: 9,
      note: 'Voice of Death: cast Speak with Dead once per Short or Long Rest without a slot or components (Dexterity), optionally targeting one of your soul trinkets.',
    },
    {
      type: 'reminder',
      minLevel: 17,
      note: "Death's Friend — Draw of Death: when you roll Initiative with no soul trinkets remaining, you gain one.",
    },
  ]);
}
