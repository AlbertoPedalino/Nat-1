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
    getWeaponMasteryChoiceCount,
    getWeaponMasteryChoiceNames,
    WEAPON_MASTERY_RULES,
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

registerClassAdapter("Fighter", function (cls, lv, specs, ctx = {}) {
  if (lv >= 1) {
    const weapons = getWeaponMasteryChoiceNames(ctx.items, allItemsDb, WEAPON_MASTERY_RULES.fighter);
    specs.push({
      key: 'fighter_weapon_mastery',
      label: 'Weapon Mastery (Fighter)',
      type: 'generic_choice',
      from: weapons,
      count: getWeaponMasteryChoiceCount('fighter', lv),
      level: 1
    });
    specs.push({
      key: 'fighter_fighting_style',
      label: 'Fighting Style',
      type: 'feat_cat',
      categories: ['FS'],
      count: 1,
      level: 1
    });
  }
  if (lv >= 19) {
    specs.push({
      key: 'fighter_epic_boon',
      label: 'Epic Boon',
      type: 'feat_cat',
      categories: ['EB'],
      count: 1,
      level: 19
    });
  }
});

// [SheetRuntime] START
registerClassSheetActions("Fighter", [
  {
    name: 'Second Wind',
    icon: '',
    cat: 'bonus',
    uses: '1-3 / SR',
    resKey: 'second_wind',
    rollers: [{ kind: 'heal', formula: ({ ownerLevel }) => {
      const lvNum = Number(ownerLevel || 1);
      return `1d10${lvNum >= 0 ? '+' : ''}${lvNum}`;
    } }],
    rollLabelPrefix: 'Heal',
    desc: 'Bonus Action: regain 1d10 + Fighter level HP. Uses: 2 (lv.1), 3 (lv.4), 4 (lv.10). Recharge: Short or Long Rest.'
  },
  {
    name: 'Action Surge',
    icon: '',
    cat: 'action',
    uses: '1-2 / SR',
    resKey: 'action_surge',
    minLevel: 2,
    desc: 'Take one additional action on your turn. Uses: 1 (lv.2-16), 2 (lv.17+). Recharge: Short or Long Rest.'
  },
  {
    name: 'Tactical Mind',
    icon: '',
    cat: 'reaction',
    uses: 'Second Wind',
    minLevel: 2,
    rollers: [{ kind: 'utility', formula: '1d10', label: '+1d10' }],
    rollLabelPrefix: 'Roll',
    desc: 'When you fail an ability check, you can expend a use of Second Wind (as a Reaction) to add 1d10 to the check result, possibly changing the outcome.'
  },
  {
    name: 'Extra Attack',
    icon: '',
    cat: 'attack',
    uses: 'Passive',
    passive: true,
    minLevel: 5,
    desc: 'Attack twice when you take the Attack action (lv.5). Three times at lv.11. Four times at lv.20.'
  },
  {
    name: 'Tactical Master',
    icon: '',
    cat: 'attack',
    uses: 'Passive',
    passive: true,
    minLevel: 9,
    desc: 'Passive: when you attack with a weapon whose Mastery property you can use, you can replace that Mastery property with Push, Sap, or Slow for that attack only.'
  },
  {
    name: 'Studied Attacks',
    icon: '',
    cat: 'attack',
    uses: 'Passive',
    passive: true,
    minLevel: 13,
    desc: 'Passive: when you miss with an attack roll using a weapon, you gain Advantage on your next attack roll against the same target before the end of your next turn.'
  },
  {
    name: 'Indomitable',
    icon: '',
    cat: 'reaction',
    uses: '1-3 / LR',
    resKey: 'indomitable',
    minLevel: 9,
    desc: 'When you fail a saving throw, you can reroll it, adding your Fighter level to the result, and must use the new result. Uses: 1 (lv.9-12), 2 (lv.13-16), 3 (lv.17+). Recharge: Long Rest.'
  },
  {
    name: 'Tactical Shift',
    icon: '',
    cat: 'bonus',
    uses: 'On Second Wind',
    passive: true,
    minLevel: 5,
    desc: "When you use Second Wind, you can move up to half your Speed without provoking Opportunity Attacks."
  }
]);
registerClassSheetResources("Fighter", [
  {
    key: 'second_wind',
    name: 'Second Wind',
    icon: 'wind',
    recharge: 'SR',
    max: (lv)=>lv>=10?4:lv>=4?3:2
  },
  {
    key: 'action_surge',
    name: 'Action Surge',
    icon: 'zap',
    recharge: 'SR',
    max: (lv)=>lv>=17?2:1
  },
  {
    key: 'indomitable',
    name: 'Indomitable',
    icon: 'shield',
    recharge: 'LR',
    max: (lv)=>lv>=17?3:lv>=13?2:1
  }
]);
// [SheetRuntime] END
}
