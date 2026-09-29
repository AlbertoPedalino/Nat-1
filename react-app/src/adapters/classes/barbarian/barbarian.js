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
registerClassAdapter("Barbarian", function (cls, lv, specs, ctx = {}) {
  if (lv >= 1) {
    const weapons = getWeaponMasteryChoiceNames(ctx.items, allItemsDb, WEAPON_MASTERY_RULES.barbarian);
    specs.push({
      key: 'barbarian_weapon_mastery',
      label: 'Weapon Mastery (Barbarian)',
      type: 'generic_choice',
      from: weapons,
      count: getWeaponMasteryChoiceCount('barbarian', lv),
      level: 1
    });
  }
  if (lv >= 3) {
    const allSkills = typeof SKILLS !== 'undefined'
      ? SKILLS.map(function (s) { return s.n; })
      : ['Acrobatics','Animal Handling','Arcana','Athletics','Perception',
         'Sleight of Hand','Stealth','Investigation','Deception','Insight',
         'Intimidation','Medicine','Nature','History','Performance',
         'Persuasion','Religion','Survival'];
    specs.push({
      key: 'barbarian_primal_knowledge',
      label: 'Primal Knowledge (Extra Skill)',
      type: 'skill_choice',
      from: allSkills,
      count: 1,
      level: 3
    });
  }
  if (lv >= 19) {
    specs.push({ key: 'barbarian_epic_boon', label: 'Epic Boon', type: 'feat_cat', categories: ['EB'], count: 1, level: 19 });
  }
});

function _barbarianRaging(C) { return !!C && C.rageActive === true; }

registerClassSheetEffects("Barbarian", [
  { type: "acFormula", key: "barbarian_unarmored_defense", label: "Unarmored Defense", base: 10, abilities: ["dex", "con"], allowShield: true, minLevel: 1, requiresNoArmor: true },
  // Danger Sense: Advantage on DEX saves (unless Incapacitated).
  { type: "advantage", target: "save", ability: "dex", minLevel: 2, note: "Danger Sense" },
  // Rage (while active): Advantage on STR saves + Rage Damage to STR melee attacks.
  { type: "advantage", target: "save", ability: "str", minLevel: 1, note: "Rage", condition: _barbarianRaging },
  // Feral Instinct: Advantage on Initiative rolls.
  { type: "advantage", target: "initiative", minLevel: 7, note: "Feral Instinct." },
  { type: "meleeDamageBonus", ability: "str", value: 2, minLevel: 1,  note: "Rage", condition: _barbarianRaging },
  { type: "meleeDamageBonus", ability: "str", value: 3, minLevel: 9,  note: "Rage", condition: _barbarianRaging },
  { type: "meleeDamageBonus", ability: "str", value: 4, minLevel: 16, note: "Rage", condition: _barbarianRaging },
]);

// [SheetRuntime] START
registerClassSheetActions("Barbarian", [
  {
    "name": "Rage",
    "icon": "",
    "cat": "bonus",
    "uses": "2+ / LR (+1 SR)",
    "resKey": "rage",
    "_toggleKey": "rage",
    "_toggleCondition": function (ctx) {
      var C = ctx && ctx.C;
      var hasHeavyArmor = (C && C.inventory || []).some(function (i) {
        return i.equipped && String(i.type || '').toUpperCase() === 'HA';
      });
      return { canActivate: !hasHeavyArmor, isSuppressed: hasHeavyArmor };
    }
  },
  {
    "name": "Reckless Attack",
    "icon": "",
    "cat": "attack",
    "uses": "Unlimited",
    "minLevel": 2
  },
  {
    "name": "Brutal Strike",
    "icon": "",
    "cat": "attack",
    "uses": "While Raging",
    "minLevel": 9,
    rollers: [{ kind: 'damage', formula: "1d10", label: "+1d10" }]
  },
  {
    "name": "Improved Brutal Strike",
    "icon": "",
    "cat": "attack",
    "uses": "While Raging",
    "minLevel": 13,
    rollers: [{ kind: 'damage', formula: "1d10", label: "+1d10" }]
  },
  {
    "name": "Brutal Strike (lv17 upgrade)",
    "icon": "",
    "cat": "attack",
    "uses": "While Raging",
    "minLevel": 17,
    rollers: [{ kind: 'damage', formula: "2d10", label: "+2d10" }]
  },
  {
    "name": "Relentless Rage",
    "icon": "",
    "cat": "reaction",
    "uses": "DC 10+ CON",
    "minLevel": 11
  }
]);
registerClassSheetResources("Barbarian", [
  {
    "key": "rage",
    "name": "Rage",
    "icon": "angry",
    "recharge": "LR",
    "max": (lv)=>lv>=20?Infinity:lv>=17?6:lv>=12?5:lv>=6?4:lv>=3?3:2,
    "srRecover": 1
  }
]);
// [SheetRuntime] END

}
