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
      icon: 'skull',
      cat: 'action',
      uses: '1 / LR',
      resKey: 'reanimator_companion',
      minLevel: 3,
      desc: 'Magic action (using Tinker\'s Tools or other Artisan\'s Tools you\'re proficient with): create a Reanimated Companion in an unoccupied space within 5 ft. It is Friendly to you and your allies, obeys you, and lasts until you finish a Long Rest or dismiss it. In combat it acts on your turn, taking only the Dodge action unless you spend a Bonus Action to command it. Once per Long Rest, or expend a spell slot to create one. Only one companion at a time.',
    },
    {
      name: 'Jolt to Life',
      icon: 'zap',
      cat: 'special',
      uses: 'INT mod / LR',
      resKey: 'reanimator_jolt',
      minLevel: 3,
      desc: 'When you cast Spare the Dying, you can modify it so the target also regains Hit Points equal to your Artificer level, and each creature of your choice in a 10-ft Emanation from the target makes a Dexterity save against your spell save DC, taking {@dice 2d4} Lightning damage (half on a success). Uses equal to your Intelligence modifier, regained on a Long Rest. Lightning increases to 3d4 at level 11 and 4d4 at level 17.',
    },
    {
      name: 'Facilitated Revival',
      icon: 'cross',
      cat: 'action',
      uses: 'See Raise Dead',
      passive: true,
      minLevel: 15,
      desc: 'Cast Raise Dead once without a spell slot and without Material components, using Tinker\'s Tools or other Artisan\'s Tools you\'re proficient with as the Spellcasting Focus. Once per Long Rest.',
    },
    {
      name: 'Life Transfer',
      icon: 'heart',
      cat: 'reaction',
      uses: 'Special',
      minLevel: 15,
      desc: 'When you or your Reanimated Companion takes damage, take a Reaction to gain Hit Points equal to your companion\'s current Hit Points. The companion then drops to 0 Hit Points and dies, triggering its Death Burst.',
    },
  ]);

  registerSubclassSheetResources('Artificer_Reanimator', [
    {
      key: 'reanimator_companion',
      name: 'Reanimated Companion',
      icon: 'skull',
      recharge: 'LR',
      minLevel: 3,
      max: 1,
    },
    {
      key: 'reanimator_jolt',
      name: 'Jolt to Life',
      icon: 'zap',
      recharge: 'LR',
      minLevel: 3,
      max: (lv, mods) => Math.max(1, mods?.int ?? 1),
    },
  ]);

  registerSubclassSheetProficiencies('Artificer_Reanimator', [
    { type: 'tool', values: ["Alchemist's Supplies"], minLevel: 3 },
  ]);

  registerSubclassSheetEffects('Artificer_Reanimator', [
    {
      type: 'reminder',
      minLevel: 5,
      note: 'Strange Modifications: when you create your companion, it gains one option (Arcane Conduit or Ferocity). Two options at level 9 (Macabre Modifications adds Bloated, Gaunt, Moist), three at level 15.',
    },
    {
      type: 'reminder',
      minLevel: 9,
      note: 'Improved Reanimation: your companion\'s Death Burst increases to 4d4, and Necrotic damage it deals ignores Resistance.',
    },
  ]);
}
