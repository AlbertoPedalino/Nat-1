import { createAdapterBindings } from '../adapterBindings.js';
import { buildLineageOptions } from './lineageOptions.js';

export default function install(registry, context = {}) {
  const {
    registerSpeciesAdapter,
    registerSpeciesSheetEffects,
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

}
