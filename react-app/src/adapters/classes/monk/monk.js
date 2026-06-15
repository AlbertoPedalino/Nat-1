import { createAdapterBindings } from '../../adapterBindings.js';

export default function install(registry, context = {}) {
  const {
    SKILLS,
    _ARTISAN_TOOLS,
    _MUSICAL_INSTRUMENTS,
    _GAMING_SETS,
    _VEHICLE_TOOLS,
    _STD_LANGS,
    _EXOTIC_LANGS,
    _ALL_LANGS,
    _ALL_TOOLS,
    allItemsDb,
    registerClassAdapter,
    getClassAdapter,
    registerSubclassAdapter,
    getSubclassAdapter,
    registerSpeciesAdapter,
    getSpeciesAdapter,
    registerFeatAdapter,
    getFeatAdapter,
    registerClassSheetActions,
    getClassSheetActions,
    registerSubclassSheetActions,
    getSubclassSheetActions,
    registerSpeciesSheetActions,
    getSpeciesSheetActions,
    registerFeatSheetActions,
    getFeatSheetActions,
    registerClassSheetResources,
    getClassSheetResources,
    registerSubclassSheetResources,
    getSubclassSheetResources,
    registerSpeciesSheetResources,
    getSpeciesSheetResources,
    registerFeatSheetResources,
    getFeatSheetResources,
    registerClassSheetEffects,
    getClassSheetEffects,
    registerSubclassSheetEffects,
    getSubclassSheetEffects,
    registerSpeciesSheetEffects,
    getSpeciesSheetEffects,
    registerFeatSheetEffects,
    getFeatSheetEffects,
    registerClassRuntimeConfig,
    getClassRuntimeConfig,
    registerSubclassRuntimeConfig,
    getSubclassRuntimeConfig,
    registerSpeciesRuntimeConfig,
    getSpeciesRuntimeConfig,
    registerClassSheetChoiceMeta,
    getClassSheetChoiceMeta,
    registerSubclassSheetChoiceMeta,
    getSubclassSheetChoiceMeta,
    registerSpeciesSheetChoiceMeta,
    getSpeciesSheetChoiceMeta,
    registerClassSheetCommonChoiceMeta,
    registerSubclassSheetCommonChoiceMeta,
    registerSpeciesSheetCommonChoiceMeta,
    registerItemFlagDef,
    getItemFlagDef,
    getAllItemFlagDefs,
    registerWeaponAbilityOverride,
    getWeaponAbilityOverrides,
    registerClassSheetFeatureFilter,
    getClassSheetFeatureFilters,
    registerSubclassSheetFeatureFilter,
    getSubclassSheetFeatureFilters,
    registerSpeciesSheetFeatureFilter,
    getSpeciesSheetFeatureFilters,
    registerClassSheetProficiencies,
    getClassSheetProficiencies,
    registerSubclassSheetProficiencies,
    getSubclassSheetProficiencies,
    registerSpeciesSheetProficiencies,
    getSpeciesSheetProficiencies,
    registerClassSheetSpellModifiers,
    getClassSheetSpellModifiers,
    registerSubclassSheetSpellModifiers,
    getSubclassSheetSpellModifiers,
    registerSpeciesSheetSpellModifiers,
    getSpeciesSheetSpellModifiers,
    registerClassChoiceKeyFilter,
    getClassChoiceKeyFilter,
    registerClassChoiceLabelProvider,
    getClassChoiceLabelProvider,
    registerSpeciesSheetHpBonus,
    getSpeciesSheetHpBonus,
    registerClassAtWillSpells,
    getClassAtWillSpells,
    registerSpeciesLongRestGrants,
    getSpeciesLongRestGrants,
    registerResourceSideEffect,
    getResourceSideEffect,
    registerSubclassChoiceDetailDataProvider,
    getSubclassChoiceDetailDataProvider,
    registerGlobalClassAdapter,
    getGlobalClassAdapters,
    registerGlobalSubclassAdapter,
    getGlobalSubclassAdapters,
    registerGlobalSpeciesAdapter,
    getGlobalSpeciesAdapters,
    registerGlobalFeatAdapter,
    getGlobalFeatAdapters,
    registerGlobalSpellAdapter,
    getGlobalSpellAdapters,
    registerGlobalItemAdapter,
    getGlobalItemAdapters,
    registerCantripData,
    getCantripData,
    registerCantripDataModifier,
    getCantripDataModifiers,
    registerSpellData,
    getSpellData,
    getGenericSpeciesChoiceSpecs,
    getGenericBackgroundChoiceSpecs,
    getGenericBackgroundChoiceMeta,
    getGenericBackgroundOriginFeat,
  } = createAdapterBindings(registry, context);
  const getMod = context?.getMod;
  const getFinal = context?.getFinal;

registerClassAdapter("Monk", function (cls, lv, specs) {
  if (lv >= 1) {
    specs.push({
      key: 'monk_tool_proficiency',
      label: 'Tool Proficiency (Tools or Instrument)',
      type: 'generic_choice',
      from: (_ARTISAN_TOOLS || []).concat(_MUSICAL_INSTRUMENTS || []),
      count: 1,
      level: 1
    });
  }
  if (lv >= 19) {
    specs.push({ key: 'monk_epic_boon', label: 'Epic Boon', type: 'feat_cat', categories: ['EB'], count: 1, level: 19 });
  }
});

registerClassSheetEffects("Monk", [
  { type: "acFormula", key: "monk_unarmored_defense", label: "Unarmored Defense", base: 10, abilities: ["dex", "wis"], allowShield: false, minLevel: 1, requiresNoArmor: true },
]);

// [SheetRuntime] START
registerClassSheetActions("Monk", [
  {
    name: 'Unarmored Defense',
    icon: '',
    cat: 'action',
    uses: 'Passive',
    passive: true,
    desc: 'While not wearing armor and not using a Shield: your AC equals 10 + DEX modifier + WIS modifier.'
  },
  {
    name: 'Martial Arts',
    icon: '',
    cat: 'attack',
    uses: 'Passive',
    passive: true,
    rollFormula: ({ ownerLevel }) => {
      const lv = Number(ownerLevel || 1);
      const die = lv >= 17 ? 12 : lv >= 11 ? 10 : lv >= 5 ? 8 : 6;
      return `1d${die}`;
    },
    desc: 'With Simple weapons, Monk weapons, or Unarmed Strikes: use DEX instead of STR for attack and damage. Unarmed Strike die: d6 (lv.1-4), d8 (lv.5-10), d10 (lv.11-16), d12 (lv.17-20). After the Attack action: make one Unarmed Strike as a Bonus Action (free, no Focus Point cost).'
  },
  {
    name: 'Unarmored Movement',
    icon: '',
    cat: 'action',
    uses: 'Passive',
    passive: true,
    minLevel: 2,
    desc: 'Speed increases by 10 ft while not wearing armor or using a Shield (+15 at lv.6, +20 at lv.10, +25 at lv.14, +30 at lv.18).'
  },
  {
    name: 'Uncanny Metabolism',
    icon: '',
    cat: 'action',
    uses: '1 / LR',
    resKey: 'uncanny_metabolism',
    minLevel: 2,
    desc: 'Once per Long Rest, when you roll Initiative, you regain all expended Focus Points and regain HP equal to your Monk level + your Martial Arts die.'
  },
  {
    name: 'Flurry of Blows',
    icon: '',
    cat: 'bonus',
    uses: '1 Focus Point',
    resKey: 'ki',
    minLevel: 2,
    rollFormula: ({ ownerLevel }) => {
      const lv = Number(ownerLevel || 1);
      const die = lv >= 17 ? 12 : lv >= 11 ? 10 : lv >= 5 ? 8 : 6;
      return `2d${die}`;
    },
    desc: 'After the Attack action, spend 1 Focus Point to make 2 Unarmed Strikes as a Bonus Action. At lv.10 (Heightened Focus): make 3 Unarmed Strikes instead.'
  },
  {
    name: 'Patient Defense',
    icon: '',
    cat: 'bonus',
    uses: 'Free / 1 Focus Point',
    resKey: 'ki',
    minLevel: 2,
    desc: 'Free (Bonus Action): take the Disengage action. Alternatively, spend 1 Focus Point (Bonus Action) to take both the Disengage and Dodge actions. At lv.10: the Focus Point version also grants Temporary HP equal to two Martial Arts die rolls.'
  },
  {
    name: 'Step of the Wind',
    icon: '',
    cat: 'bonus',
    uses: 'Free / 1 Focus Point',
    resKey: 'ki',
    minLevel: 2,
    desc: 'Free (Bonus Action): take the Dash action. Alternatively, spend 1 Focus Point (Bonus Action) to take both the Disengage and Dash actions. Jump distance doubles for the turn. At lv.10: the Focus Point version lets you move one willing ally within 5 ft up to your Speed (no Opportunity Attacks).'
  },
  {
    name: 'Deflect Attacks',
    icon: '',
    cat: 'reaction',
    uses: 'Free / 1 FP redirect',
    resKey: 'ki',
    minLevel: 3,
    rollFormula: ({ ownerLevel, character }) => {
      const lv = Number(ownerLevel || 1);
      const dex = typeof getMod === 'function' && typeof getFinal === 'function'
        ? Number(getMod(getFinal(character, 'dex')) || 0)
        : 0;
      const total = dex + lv;
      return `1d10${total >= 0 ? '+' : ''}${total}`;
    },
    rollKind: 'utility',
    rollButtonLabel: ({ formula }) => `${String(formula || '')} reduce`,
    rollLabelPrefix: 'Deflect Attacks',
    desc: 'Reaction when you take B/P/S damage (lv.3) or any damage type (lv.13 Deflect Energy). Reduce the damage by 1d10 + DEX modifier + Monk level. If reduced to 0: spend 1 Focus Point to redirect as a ranged attack (20/60 ft, Martial Arts die + DEX).'
  },
  {
    name: 'Slow Fall',
    icon: '',
    cat: 'reaction',
    uses: 'Passive',
    passive: true,
    minLevel: 4,
    desc: 'Reaction when falling: reduce falling damage by an amount equal to your Monk level × 5.'
  },
  {
    name: 'Extra Attack',
    icon: '',
    cat: 'attack',
    uses: 'Passive',
    passive: true,
    minLevel: 5,
    desc: 'You can attack twice, instead of once, whenever you take the Attack action on your turn.'
  },
  {
    name: 'Stunning Strike',
    icon: '',
    cat: 'attack',
    uses: '1 Focus Point',
    resKey: 'ki',
    minLevel: 5,
    desc: 'When you hit a creature with a weapon or Unarmed Strike, spend 1 Focus Point to force a CON save (DC = 8+PB+WIS). Failure: the target has the Stunned condition until the start of your next turn.'
  },
  {
    name: 'Empowered Strikes',
    icon: '',
    cat: 'attack',
    uses: 'Passive',
    passive: true,
    minLevel: 6,
    desc: 'Your Unarmed Strikes deal your choice of Force damage or their normal Bludgeoning damage.'
  },
  {
    name: 'Evasion',
    icon: '',
    cat: 'reaction',
    uses: 'Passive',
    passive: true,
    minLevel: 7,
    desc: "When you are subjected to an effect that allows a DEX save for half damage: take no damage on success, half on failure. Doesn't work if you have the Incapacitated condition."
  },
  {
    name: 'Acrobatic Movement',
    icon: '',
    cat: 'action',
    uses: 'Passive',
    passive: true,
    minLevel: 9,
    desc: 'You can move along vertical surfaces and across liquids on your turn without falling during the move.'
  },
  {
    name: 'Heightened Focus',
    icon: '',
    cat: 'action',
    uses: 'Passive',
    passive: true,
    minLevel: 10,
    desc: 'Your three Focus Point techniques are enhanced: Flurry of Blows adds a 3rd strike; Patient Defense (Focus Point version) also grants Temp HP equal to two Martial Arts dice; Step of the Wind (Focus Point version) also lets you move one willing ally within 5 ft up to your Speed without Opportunity Attacks.'
  },
  {
    name: 'Self-Restoration',
    icon: '',
    cat: 'action',
    uses: 'Passive',
    passive: true,
    minLevel: 10,
    desc: 'At the end of each of your turns, you can end one of the following conditions on yourself: Charmed, Frightened, or Poisoned.'
  },
  {
    name: 'Deflect Energy',
    icon: '',
    cat: 'action',
    uses: 'Passive',
    passive: true,
    minLevel: 13,
    desc: 'Deflect Attacks now works against all damage types (not just Bludgeoning, Piercing, and Slashing).'
  },
  {
    name: 'Disciplined Survivor',
    icon: '',
    cat: 'action',
    uses: '1 Focus Point',
    resKey: 'ki',
    minLevel: 14,
    desc: 'You gain proficiency in all saving throws. When you fail a saving throw, you can spend 1 Focus Point to reroll it with a bonus equal to your WIS modifier and use the new result.'
  },
  {
    name: 'Perfect Focus',
    icon: '',
    cat: 'action',
    uses: 'Passive',
    passive: true,
    minLevel: 15,
    desc: "When you roll Initiative and don't use Uncanny Metabolism, if you have 3 or fewer Focus Points remaining, you regain Focus Points until you have 4."
  },
  {
    name: 'Superior Defense',
    icon: '',
    cat: 'action',
    uses: '3 Focus Points',
    resKey: 'ki',
    minLevel: 18,
    desc: 'Spend 3 Focus Points at the start of your turn: gain Resistance to all damage except Force for 1 minute.'
  },
  {
    name: 'Body and Mind',
    icon: '',
    cat: 'action',
    uses: 'Passive',
    passive: true,
    minLevel: 20,
    desc: 'Your Dexterity and Wisdom scores each increase by 4, to a maximum of 25.'
  }
]);
registerClassSheetResources("Monk", [
  {
    key: 'ki',
    name: 'Focus Points',
    icon: 'orbit',
    recharge: 'SR',
    max: (lv) => lv,
    pool: true,
    track: 'used'
  },
  {
    key: 'uncanny_metabolism',
    name: 'Uncanny Metabolism',
    icon: 'zap',
    recharge: 'LR',
    minLevel: 2,
    max: () => 1
  }
]);
// [SheetRuntime] END

}

