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
registerSubclassAdapter("Druid_Land", function (cls, lv, specs) {
  if (lv >= 3) {
    specs.push({
      key: 'subclass_land_terrain',
      label: 'Land Type (Circle of the Land)',
      type: 'generic_choice',
      from: ['Arid', 'Polar', 'Temperate', 'Tropical'],
      count: 1,
      level: 3
    });
  }
});

// [SheetRuntime] START
registerSubclassSheetActions("Druid_Land", [
  {
    "name": "Land's Aid",
    "icon": "",
    "cat": "action",
    "uses": "Wild Shape charge",
    "resKey": "wild_shape",
    "minLevel": 3,
    rollers: [{ kind: 'damage', formula: ({ ownerLevel }) => {
      const lv = Number(ownerLevel || 1);
      return lv >= 14 ? "4d6" : lv >= 10 ? "3d6" : "2d6";
    }, label: ({ formula }) => `${formula} necrotic` }],
    "desc": "Magic action: expend a use of Wild Shape and choose a point within 60 ft. Vitality-giving flowers and life-draining thorns appear in a 10-ft Sphere centered on that point. Each creature of your choice in the Sphere must make a CON saving throw (spell save DC), taking 2d6 Necrotic damage on a failed save or half on a success (increases to 3d6 at lv.10, 4d6 at lv.14). One creature of your choice in that area regains 2d6 HP (3d6 at lv.10, 4d6 at lv.14)."
  },
  {
    "name": "Natural Recovery",
    "icon": "",
    "cat": "action",
    "uses": "1 / LR",
    "resKey": "natural_recovery",
    "minLevel": 6,
    "desc": "Two benefits (each 1/LR): Free Spell — cast one level 1+ spell you have prepared from your Circle Spells feature without expending a spell slot. Short Rest Recovery — when you finish a Short Rest, recover expended spell slots with a combined level ≤ half your Druid level (round up), with no single slot of level 6+."
  },
  {
    "name": "Nature's Ward",
    "icon": "",
    "cat": "action",
    "uses": "Passive",
    "passive": true,
    "minLevel": 10,
    "desc": "Passive: you are immune to the Poisoned condition. You have Resistance to a damage type associated with your current land choice (see the Nature's Ward table in your subclass description)."
  },
  {
    "name": "Nature's Sanctuary",
    "icon": "",
    "cat": "action",
    "uses": "Wild Shape charge",
    "resKey": "wild_shape",
    "minLevel": 14,
    "desc": "Magic action: expend a use of Wild Shape to cause spectral trees and vines to appear in a 15-ft Cube on the ground within 120 ft. They last 1 minute or until you are Incapacitated or die. While in that area: you and your allies have Half Cover, and your allies gain your current Nature's Ward Resistance. Bonus Action: move the Cube up to 60 ft to ground within 120 ft of yourself."
  }
]);
registerSubclassSheetResources("Druid_Land", [
  {
    "key": "natural_recovery",
    "name": "Natural Recovery",
    "icon": "leaf",
    "recharge": "LR",
    "max": () => 1
  }
]);

registerSubclassSheetEffects("Druid_Land", [

  { type: "conditionImmunity", conditions: ["Poisoned"], minLevel: 10, note: "Nature's Ward." },
  { type: "resistance-choice", key: "subclass_land_terrain", minLevel: 10, note: "Nature's Ward: resistance based on selected land type.",
    map: {
      arid: 'Fire',
      polar: 'Cold',
      temperate: 'Lightning',
      tropical: 'Poison',
    } },

]);

if (typeof registerResourceSideEffect === 'function') {
  registerResourceSideEffect('natural_recovery', function (ctx = {}) {
    const C = ctx.character || ctx.C;
    let druidLv = 0;
    if (String(C?.className || '').toLowerCase() === 'druid') druidLv += C?.classLevel || C?.level || 0;
    (C?.extraClasses || []).forEach(function (ec) {
      if (String(ec?.name || '').toLowerCase() === 'druid') druidLv += ec.level || 0;
    });
    if (!druidLv) return null;
    const budget = Math.ceil(druidLv / 2);
    return {
      type: 'recover_spell_slots',
      budget,
      maxSlotLevel: 5,
      label: 'Natural Recovery',
    };
  });
}
// [SheetRuntime] END

}

