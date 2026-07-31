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
const GNOME_LINEAGE = { FOREST: 'Forest Gnome', ROCK: 'Rock Gnome' };

registerSpeciesAdapter("Gnome_XPHB", function (s) {
  const specs = getGenericSpeciesChoiceSpecs(s);
  const lineageOptions = buildLineageOptions(s._versions, { parentName: 'Gnome', suffixes: ['Lineage'], expect: Object.values(GNOME_LINEAGE) });
  specs.push({ key: 'species_version', label: 'Gnomish Lineage', type: 'option', options: lineageOptions, count: 1, level: 1 });
  specs.push({ key: 'species_spell_ability', label: 'Spellcasting Ability (Gnome)', type: 'ability_choice', from: ['int', 'wis', 'cha'], count: 1, level: 1 });
  return specs;
});

registerSpeciesSheetCommonChoiceMeta("Gnome_XPHB", {
  labels: {
    species_version: 'Gnomish Lineage',
    species_spell_ability: 'Spellcasting Ability (Gnome)',
  },
});

// Gnomish Cunning: Advantage on Intelligence, Wisdom, and Charisma saving throws.
registerSpeciesSheetEffects("Gnome_XPHB", [
  { type: 'advantage', target: 'save', abilities: ['int', 'wis', 'cha'], minLevel: 1, note: 'Gnomish Cunning' },
]);

registerSpeciesRuntimeConfig("Gnome_XPHB", {
  spellcasting: {
    alwaysKnownSpells: [
      // Forest Gnome Lineage
      { name: 'Minor Illusion',    level: 0, minLevel: 1, source: 'Forest Gnome Lineage', sourceType: 'species', requiredChoice: { key: 'species_version', value: GNOME_LINEAGE.FOREST } },
      { name: 'Speak with Animals', level: 1, minLevel: 1, source: 'Forest Gnome Lineage', sourceType: 'species', requiredChoice: { key: 'species_version', value: GNOME_LINEAGE.FOREST }, freeCast: { usesFormula: 'proficiencyBonus', recharge: 'longRest', canAlsoUseSlots: true } },
      // Rock Gnome Lineage
      { name: 'Mending',           level: 0, minLevel: 1, source: 'Rock Gnome Lineage', sourceType: 'species', requiredChoice: { key: 'species_version', value: GNOME_LINEAGE.ROCK } },
      { name: 'Prestidigitation',  level: 0, minLevel: 1, source: 'Rock Gnome Lineage', sourceType: 'species', requiredChoice: { key: 'species_version', value: GNOME_LINEAGE.ROCK } },
    ],
  },
});

}

