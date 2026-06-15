import { createAdapterBindings } from '../../adapterBindings.js';
import { getArtificerConditionalBonusToolCount } from './artificerTools.js';

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
registerSubclassAdapter("Artificer_Battle Smith", function (cls, lv, specs, ctx = {}) {
  if (lv < 3) return;
  const bonusCount = getArtificerConditionalBonusToolCount(ctx, ["Smith's Tools"], cls);
  if (!bonusCount) return;
  specs.push({
    key: 'battlesmith_bonus_tool',
    label: 'Battle Smith - Bonus Artisan Tool',
    type: 'generic_choice',
    from: _ARTISAN_TOOLS,
    count: bonusCount,
    level: 3
  });
});

// [SheetRuntime] START
registerSubclassSheetActions("Artificer_Battle Smith", [
  {
    "name": "Battle Ready",
    "icon": "",
    "cat": "action",
    "uses": "Passive",
    "passive": true,
    "minLevel": 3,
    "desc": "Passive: you gain proficiency with martial weapons. When you attack with a magic weapon, you can use your INT modifier instead of STR or DEX for the attack and damage rolls. You can use a weapon with which you have proficiency as a spellcasting focus for your Artificer spells."
  },
  {
    "name": "Steel Defender",
    "icon": "",
    "cat": "bonus",
    "uses": "Bonus Action (command)",
    "minLevel": 3,
    "desc": "Your Steel Defender acts on your initiative. It takes the Dodge action unless you spend a Bonus Action to command it to take another action. If you are Incapacitated, it acts on its own. Revival: if it died within the last hour, take a Magic action and expend a spell slot to touch it — it revives after 1 minute with full HP. Recreate after Long Rest (requires Smith's Tools)."
  },
  {
    "name": "Extra Attack",
    "icon": "",
    "cat": "attack",
    "uses": "Passive",
    "passive": true,
    "minLevel": 5,
    "desc": "Attack twice instead of once when you take the Attack action. You can forgo one of those attacks to command your Steel Defender to take the Force-Empowered Rend action."
  },
  {
    "name": "Arcane Jolt",
    "icon": "",
    "cat": "attack",
    "uses": "INT mod / LR",
    "resKey": "arcane_jolt",
    "minLevel": 9,
    "rollFormula": ({ ownerLevel }) => Number(ownerLevel || 1) >= 15 ? '4d6' : '2d6',
    "rollButtonLabel": ({ formula }) => `+${formula} force`,
    "rollKind": "damage",
    "rollLabelPrefix": "Arcane Jolt",
    "desc": "When you or your Steel Defender hits with an attack, channel arcane energy: either deal extra Force damage (2d6; 4d6 at lv.15) to the target, OR restore HP to a creature within 30 ft of the target (same amount). Uses: INT modifier (min 1) per Long Rest. Recharge: Long Rest."
  },
  {
    "name": "Improved Defender",
    "icon": "",
    "cat": "action",
    "uses": "Passive",
    "passive": true,
    "minLevel": 15,
    "desc": "Improved Jolt: Arcane Jolt damage/healing increases to 4d6. Improved Deflection: when your Steel Defender uses Deflect Attack, the attacker takes Force damage equal to 1d4 + your INT modifier."
  }
]);
registerSubclassSheetResources("Artificer_Battle Smith", [
  {
    "key": "arcane_jolt",
    "name": "Arcane Jolt",
    "icon": "zap",
    "recharge": "LR",
    "max": (lv, { int } = {}) => Math.max(1, int ?? 0)
  }
]);
registerSubclassSheetProficiencies("Artificer_Battle Smith", [
  { type: "tool", values: ["Smith's Tools"], minLevel: 3 }
]);
// [SheetRuntime] END

}

