import { createAdapterBindings } from '../../adapterBindings.js';
import { getArtificerConditionalBonusToolCount } from './artificerTools.js';

export default function install(registry, context = {}) {
  const {
    registerSubclassAdapter,
    registerSubclassRuntimeConfig,
    registerSubclassSheetActions,
    registerSubclassSheetResources,
    registerSubclassSheetEffects,
    registerSubclassSheetProficiencies,
    _ARTISAN_TOOLS,
  } = createAdapterBindings(registry, context);

  registerSubclassAdapter('Artificer_Reanimator', function (cls, lv, specs, ctx = {}) {
    if (lv < 3) return;
    const bonusCount = getArtificerConditionalBonusToolCount(ctx, ["Alchemist's Supplies"], cls);
    if (!bonusCount) return;
    specs.push({
      key: 'reanimator_bonus_tool',
      label: 'Reanimator - Bonus Artisan Tool',
      type: 'generic_choice',
      from: (_ARTISAN_TOOLS || []).filter((tool) => tool !== "Alchemist's Supplies"),
      count: bonusCount,
      level: 3,
    });
  });

  registerSubclassRuntimeConfig('Artificer_Reanimator', {
    spellcasting: {
      ability: 'int',
      alwaysKnownSpells: [
        {
          name: 'Raise Dead',
          minLevel: 15,
          source: 'Facilitated Revival',
          sourceType: 'subclass',
          freeCast: { maxUses: 1, recharge: 'longRest', canAlsoUseSlots: true },
          modifiers: [{
            key: 'facilitated-revival-materials',
            tagLabel: 'Free Cast',
            detailTitle: 'Facilitated Revival',
            detailText: 'The once-per-Long-Rest casting requires no Material components.',
          }],
        },
      ],
    },
  });

  registerSubclassSheetActions('Artificer_Reanimator', [
    {
      name: 'Reanimated Companion',
      
      cat: 'action',
      
      resKey: 'reanimator_companion',
      minLevel: 3,
    },
    {
      name: 'Jolt to Life',
      
      cat: 'special',
      
      resKey: 'reanimator_jolt',
      minLevel: 3,
    },
    {
      name: 'Life Transfer',
      
      cat: 'reaction',
      
      minLevel: 15,
    },
  ]);

  registerSubclassSheetResources('Artificer_Reanimator', [
    {
      key: 'reanimator_companion',
      name: 'Reanimated Companion',
      
      recharge: 'LR',
      minLevel: 3,
      max: 1,
    },
    {
      key: 'reanimator_jolt',
      name: 'Jolt to Life',
      
      recharge: 'LR',
      minLevel: 3,
      max: 'abilityMod:int', minMax: 1,
    },
  ]);

  registerSubclassSheetProficiencies('Artificer_Reanimator', [
    { type: 'tool', values: ["Alchemist's Supplies"], minLevel: 3 },
  ]);

}
