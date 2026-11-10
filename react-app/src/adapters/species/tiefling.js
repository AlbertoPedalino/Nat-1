import { createAdapterBindings } from '../adapterBindings.js';
import { buildLineageOptions } from './lineageOptions.js';

export default function install(registry, context = {}) {
  const {
    registerSpeciesAdapter,
    registerSpeciesSheetEffects,
    registerSpeciesRuntimeConfig,
    registerSpeciesSheetCommonChoiceMeta,
  } = createAdapterBindings(registry, context);
// Canonical legacy tokens — single source for both the choice options
// (validated against _versions via `expect`) and the requiredChoice predicates.
const TIEFLING_LEGACY = { ABYSSAL: 'Abyssal', CHTHONIC: 'Chthonic', INFERNAL: 'Infernal' };

registerSpeciesAdapter("Tiefling_XPHB", function (s) {
  let specs = [];
  specs = specs.filter(function (x) { return !String(x.key || '').startsWith('species_resist'); });

  const legacyOptions = buildLineageOptions(s._versions, { parentName: 'Tiefling', suffixes: ['Legacy'], expect: Object.values(TIEFLING_LEGACY) });

  specs.push({ key: 'species_version', label: 'Fiendish Legacy', type: 'option', options: legacyOptions, count: 1, level: 1 });
  specs.push({ key: 'species_spell_ability', label: 'Spellcasting Ability (Tiefling)', type: 'ability_choice', from: ['int', 'wis', 'cha'], count: 1, level: 1 });
  return specs;
});

registerSpeciesSheetCommonChoiceMeta("Tiefling_XPHB", {
  labels: {
    species_version: 'Fiendish Legacy',
    species_spell_ability: 'Spellcasting Ability (Tiefling)',
  },
});
// Each legacy's resistance and Abyssal's darkvision 120 ft come with its data
// (speciesVersion.js).

registerSpeciesRuntimeConfig("Tiefling_XPHB", {
  spellcasting: {
    alwaysKnownSpells: [
      // Abyssal Legacy
      { name: 'Thaumaturgy',       level: 0, minLevel: 1, source: 'Abyssal Legacy',  sourceType: 'species', requiredChoice: { key: 'species_version', value: TIEFLING_LEGACY.ABYSSAL } },
      { name: 'Poison Spray',      level: 0, minLevel: 1, source: 'Abyssal Legacy',  sourceType: 'species', requiredChoice: { key: 'species_version', value: TIEFLING_LEGACY.ABYSSAL } },
      { name: 'Ray of Sickness',   level: 1, minLevel: 3, source: 'Abyssal Legacy',  sourceType: 'species', requiredChoice: { key: 'species_version', value: TIEFLING_LEGACY.ABYSSAL }, freeCast: { maxUses: 1, recharge: 'longRest', canAlsoUseSlots: true } },
      { name: 'Hold Person',       level: 2, minLevel: 5, source: 'Abyssal Legacy',  sourceType: 'species', requiredChoice: { key: 'species_version', value: TIEFLING_LEGACY.ABYSSAL }, freeCast: { maxUses: 1, recharge: 'longRest', canAlsoUseSlots: true } },
      // Chthonic Legacy
      { name: 'Thaumaturgy',       level: 0, minLevel: 1, source: 'Chthonic Legacy', sourceType: 'species', requiredChoice: { key: 'species_version', value: TIEFLING_LEGACY.CHTHONIC } },
      { name: 'Chill Touch',       level: 0, minLevel: 1, source: 'Chthonic Legacy', sourceType: 'species', requiredChoice: { key: 'species_version', value: TIEFLING_LEGACY.CHTHONIC } },
      { name: 'False Life',        level: 1, minLevel: 3, source: 'Chthonic Legacy', sourceType: 'species', requiredChoice: { key: 'species_version', value: TIEFLING_LEGACY.CHTHONIC }, freeCast: { maxUses: 1, recharge: 'longRest', canAlsoUseSlots: true } },
      { name: 'Ray of Enfeeblement', level: 2, minLevel: 5, source: 'Chthonic Legacy', sourceType: 'species', requiredChoice: { key: 'species_version', value: TIEFLING_LEGACY.CHTHONIC }, freeCast: { maxUses: 1, recharge: 'longRest', canAlsoUseSlots: true } },
      // Infernal Legacy
      { name: 'Thaumaturgy',       level: 0, minLevel: 1, source: 'Infernal Legacy', sourceType: 'species', requiredChoice: { key: 'species_version', value: TIEFLING_LEGACY.INFERNAL } },
      { name: 'Fire Bolt',         level: 0, minLevel: 1, source: 'Infernal Legacy', sourceType: 'species', requiredChoice: { key: 'species_version', value: TIEFLING_LEGACY.INFERNAL } },
      { name: 'Hellish Rebuke',    level: 1, minLevel: 3, source: 'Infernal Legacy', sourceType: 'species', requiredChoice: { key: 'species_version', value: TIEFLING_LEGACY.INFERNAL }, freeCast: { maxUses: 1, recharge: 'longRest', canAlsoUseSlots: true } },
      { name: 'Darkness',          level: 2, minLevel: 5, source: 'Infernal Legacy', sourceType: 'species', requiredChoice: { key: 'species_version', value: TIEFLING_LEGACY.INFERNAL }, freeCast: { maxUses: 1, recharge: 'longRest', canAlsoUseSlots: true } },
    ],
  },
});

}
