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
registerSubclassAdapter("Bard_Lore", function (cls, lv, specs) {
  if (lv >= 3) {
    const allSkills = typeof SKILLS !== 'undefined'
      ? SKILLS.map(function (s) { return s.n; })
      : ['Acrobatics','Animal Handling','Arcana','Athletics','Deception',
         'History','Insight','Intimidation','Investigation','Medicine',
         'Nature','Perception','Performance','Persuasion','Religion',
         'Sleight of Hand','Stealth','Survival'];

    [1, 2, 3].forEach(function (i) {
      specs.push({
        key: 'subclass_lore_bonus_skill_' + i,
        label: 'Bonus Proficiency ' + i + ' (Lore)',
        type: 'skill_choice',
        from: allSkills,
        count: 1,
        level: 3,
        candidateSource: 'proficientSkills',
        excludeAlreadyProficient: true
      });
    });
  }
  if (lv >= 6) {
    specs.push({ key: 'subclass_lore_magical_discovery_1', label: 'Magical Discoveries 1 (Lore Lv.6)', type: 'spell_choice', spellFilter: { spellLevels: [0, 1, 2, 3], classes: ['Cleric', 'Druid', 'Wizard'] }, count: 1, level: 6 });
    specs.push({ key: 'subclass_lore_magical_discovery_2', label: 'Magical Discoveries 2 (Lore Lv.6)', type: 'spell_choice', spellFilter: { spellLevels: [0, 1, 2, 3], classes: ['Cleric', 'Druid', 'Wizard'] }, count: 1, level: 6 });
  }
});

// [SheetRuntime] START
registerSubclassSheetActions("Bard_Lore", [
  { name: "Bonus Proficiencies", icon: "", cat: "action", uses: "Passive", minLevel: 3,
  passive: true,
    desc: "Gain proficiency in three skills of your choice. Select them in the builder." },
  { name: "Cutting Words", icon: "", cat: "reaction", uses: "With Bardic Insp.", minLevel: 3,
    desc: "When a creature you can see within 60 ft makes a damage roll or succeeds on an ability check or attack roll, use your Reaction and expend one Bardic Inspiration: roll the die and subtract the result from the creature's roll, potentially reducing damage or turning a success into a failure." },
  { name: "Magical Discoveries", icon: "", cat: "action", uses: "Passive", minLevel: 6,
  passive: true,
    desc: "Choose 2 spells (cantrips or spells for which you have slots) from the Cleric, Druid, or Wizard spell list. They are always prepared as Bard spells. On each Bard level up, you can replace one of the chosen spells with another that meets these requirements." },
  { name: "Peerless Skill", icon: "", cat: "action", uses: "With Bardic Insp.", minLevel: 14,
    desc: "When you make an ability check or attack roll and fail, expend one use of Bardic Inspiration: roll the die and add the result to the d20, potentially turning failure into success. If the roll still fails, the Bardic Inspiration is not expended." },
]);

registerSubclassSheetEffects("Bard_Lore", [

  { type: "skillProficiency", count: 3, minLevel: 3, note: "Bonus Proficiencies." },
  { type: "reactionPenalty", minLevel: 3, note: "Cutting Words: subtract Bardic Inspiration die from enemy roll/damage." },
  { type: "selfInspiration", minLevel: 14, note: "Peerless Skill." },
]);
// [SheetRuntime] END

}

