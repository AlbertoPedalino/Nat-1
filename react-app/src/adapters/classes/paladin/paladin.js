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
registerClassAdapter("Paladin", function (cls, lv, specs, ctx = {}) {
  if (lv >= 1) {
    const weapons = typeof allItemsDb !== 'undefined'
      ? allItemsDb
          .filter(function (i) { return (i.type === 'M' || i.type === 'R') && (!i.rarity || i.rarity === 'none'); })
          .map(function (i) { return i.name; })
      : [];
    specs.push({
      key: 'paladin_weapon_mastery',
      label: 'Weapon Mastery (Paladin)',
      type: 'generic_choice',
      from: weapons,
      count: 2,
      level: 1
    });
  }
  if (lv >= 2) {
    specs.push({
      key: 'paladin_fighting_style',
      label: 'Fighting Style',
      type: 'feat_cat',
      categories: ['FS', 'FS:P'],
      count: 1,
      level: 2
    });
  }
  if (lv >= 19) {
    specs.push({ key: 'paladin_epic_boon', label: 'Epic Boon', type: 'feat_cat', categories: ['EB'], count: 1, level: 19 });
  }
});

// [SheetRuntime] START
registerClassSheetActions("Paladin", [
  {
    "name": "Divine Sense",
    "icon": "",
    "cat": "bonus",
    "uses": "1 Channel",
    "resKey": "paladin_channel_div",
    "minLevel": 3,
    "desc": "Channel Divinity option. Bonus Action: for 10 minutes, you know the location of any Aberration, Celestial, Fiend, or Undead within 60 ft, and any place consecrated or desecrated by a deity."
  },
  {
    "name": "Lay on Hands",
    "icon": "",
    "cat": "action",
    "uses": "Pool / LR",
    "resKey": "lay_on_hands",
    "inlinePills": ({ ownerLevel }) => [
      { icon: "heart", label: "Pool", value: `${Math.max(1, Number(ownerLevel || 1) * 5)} HP` }
    ],
    "desc": "Touch a creature to restore HP from your pool (1 HP per point spent), or spend 5 points to remove the Poisoned condition. Pool = 5 × Paladin level. Recharge: Long Rest."
  },
  {
    "name": "Channel Divinity",
    "icon": "",
    "cat": "action",
    "uses": "2-3 / SR",
    "resKey": "paladin_channel_div",
    "minLevel": 3,
    "desc": "Subclass-specific option (see your Oath). Uses: 2 (lv.3–10), 3 (lv.11+). Recharge: Short Rest."
  },
  {
    "name": "Aura of Protection",
    "icon": "",
    "cat": "action",
    "uses": "Passive",
    "passive": true,
    "minLevel": 6,
    "desc": "While conscious: you and friendly creatures within 10 ft gain +CHA modifier to saving throws (min +1)."
  },
  {
    "name": "Aura of Courage",
    "icon": "",
    "cat": "action",
    "uses": "Passive",
    "passive": true,
    "minLevel": 10,
    "desc": "While conscious: you and friendly creatures within your aura are immune to the Frightened condition."
  },
  {
    "name": "Abjure Foes",
    "icon": "",
    "cat": "action",
    "uses": "1 Channel",
    "resKey": "paladin_channel_div",
    "minLevel": 9,
    "desc": "Channel Divinity option. Magic action: up to CHA modifier creatures (min 1) within 60 ft must succeed on a WIS save (spell save DC) or have the Frightened condition for 1 minute or until they take damage."
  },
  {
    "name": "Restoring Touch",
    "icon": "",
    "cat": "action",
    "uses": "Pool / LR",
    "resKey": "lay_on_hands",
    "minLevel": 14,
    "desc": "When you use Lay on Hands on a creature, you can also remove one of the following conditions: Blinded, Charmed, Deafened, Frightened, Paralyzed, or Stunned. Each condition removed costs 5 HP from your Lay on Hands pool."
  },
  {
    "name": "Aura Expansion",
    "icon": "",
    "cat": "action",
    "uses": "Passive",
    "passive": true,
    "minLevel": 18,
    "desc": "Your Aura of Protection and Aura of Courage now extend to 30 ft."
  },
  {
    "name": "Radiant Strikes",
    "icon": "",
    "cat": "attack",
    "uses": "Passive",
    "passive": true,
    "minLevel": 11,
    "damageFormula": "1d8",
    "damageButtonLabel": "+1d8 radiant",
    "desc": "Your weapon and Unarmed Strike attacks deal an extra 1d8 Radiant damage."
  }
]);
registerClassSheetResources("Paladin", [
  {
    "key": "lay_on_hands",
    "name": "Lay on Hands",
    "icon": "hands",
    "recharge": "LR",
    "max": (lv)=>lv*5,
    "pool": true
  },
  {
    "key": "paladin_channel_div",
    "name": "Channel Divinity",
    "icon": "sparkles",
    "recharge": "SR",
    "max": (lv)=>lv>=11?3:lv>=3?2:0
  }
]);
// [SheetRuntime] END

}

