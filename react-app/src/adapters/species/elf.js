import { createAdapterBindings } from '../adapterBindings.js';
import { buildLineageOptions } from './lineageOptions.js';

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
// Canonical lineage tokens — single source for both the choice options
// (validated against _versions via `expect`) and the requiredChoice predicates.
const ELF_LINEAGE = { DROW: 'Drow', HIGH_ELF: 'High Elf', WOOD_ELF: 'Wood Elf' };

registerSpeciesAdapter("Elf_XPHB", function (s) {
  const specs = getGenericSpeciesChoiceSpecs(s);
  const lineageOptions = buildLineageOptions(s._versions, { parentName: 'Elf', suffixes: ['Lineage'], expect: Object.values(ELF_LINEAGE) });

  specs.push({ key: 'species_version', label: 'Elven Lineage', type: 'option', options: lineageOptions, count: 1, level: 1 });
  specs.push({ key: 'species_spell_ability', label: 'Spellcasting Ability (Elf)', type: 'ability_choice', from: ['int', 'wis', 'cha'], count: 1, level: 1 });
  specs.push({
    key: 'species_high_elf_cantrip',
    label: 'Wizard Cantrip (High Elf)',
    type: 'spell_choice',
    count: 1,
    level: 1,
    spellFilter: { spellLevels: [0], classes: ['Wizard'] },
    classes: ['Wizard'],
    requiredChoice: { key: 'species_version', value: ELF_LINEAGE.HIGH_ELF },
  });
  return specs;
});

registerSpeciesSheetCommonChoiceMeta("Elf_XPHB", {
  labels: {
    species_version: 'Elven Lineage',
    species_spell_ability: 'Spellcasting Ability (Elf)',
  },
});

registerSpeciesSheetEffects("Elf_XPHB", [
  // Fey Ancestry: Advantage on saves to avoid or end the Charmed condition.
  { type: 'advantage', target: 'save', conditions: ['Charmed'], minLevel: 1, note: 'Fey Ancestry' },
  {
    type: 'sense',
    senseType: 'darkvision',
    value: 120,
    minLevel: 1,
    note: 'Drow lineage',
    requiredChoice: { key: 'species_version', value: ELF_LINEAGE.DROW },
  },
  {
    type: 'speed',
    value: 5,
    minLevel: 1,
    note: 'Wood Elf lineage (Speed 35)',
    requiredChoice: { key: 'species_version', value: ELF_LINEAGE.WOOD_ELF },
  },
]);

registerSpeciesRuntimeConfig("Elf_XPHB", {
  spellcasting: {
    alwaysKnownSpells: [
      // Drow Lineage
      { name: 'Dancing Lights', level: 0, minLevel: 1, source: 'Drow Lineage', sourceType: 'species', requiredChoice: { key: 'species_version', value: ELF_LINEAGE.DROW } },
      { name: 'Faerie Fire',    level: 1, minLevel: 3, source: 'Drow Lineage', sourceType: 'species', requiredChoice: { key: 'species_version', value: ELF_LINEAGE.DROW } },
      { name: 'Darkness',       level: 2, minLevel: 5, source: 'Drow Lineage', sourceType: 'species', requiredChoice: { key: 'species_version', value: ELF_LINEAGE.DROW } },
      // High Elf Lineage
      { name: 'Detect Magic',   level: 1, minLevel: 3, source: 'High Elf Lineage', sourceType: 'species', requiredChoice: { key: 'species_version', value: ELF_LINEAGE.HIGH_ELF } },
      { name: 'Misty Step',     level: 2, minLevel: 5, source: 'High Elf Lineage', sourceType: 'species', requiredChoice: { key: 'species_version', value: ELF_LINEAGE.HIGH_ELF } },
      // Wood Elf Lineage
      { name: 'Druidcraft',     level: 0, minLevel: 1, source: 'Wood Elf Lineage', sourceType: 'species', requiredChoice: { key: 'species_version', value: ELF_LINEAGE.WOOD_ELF } },
      { name: 'Longstrider',    level: 1, minLevel: 3, source: 'Wood Elf Lineage', sourceType: 'species', requiredChoice: { key: 'species_version', value: ELF_LINEAGE.WOOD_ELF } },
      { name: 'Pass Without Trace', level: 2, minLevel: 5, source: 'Wood Elf Lineage', sourceType: 'species', requiredChoice: { key: 'species_version', value: ELF_LINEAGE.WOOD_ELF } },
    ],
  },
});

}
