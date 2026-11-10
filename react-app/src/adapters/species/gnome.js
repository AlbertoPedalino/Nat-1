import { createAdapterBindings } from '../adapterBindings.js';
import { buildLineageOptions } from './lineageOptions.js';

export default function install(registry, context = {}) {
  const {
    registerSpeciesAdapter,
    registerSpeciesSheetEffects,
    registerSpeciesSheetCommonChoiceMeta,
  } = createAdapterBindings(registry, context);
// Canonical lineage tokens — single source for both the choice options
// (validated against _versions via `expect`) and the requiredChoice predicates.
const GNOME_LINEAGE = { FOREST: 'Forest Gnome', ROCK: 'Rock Gnome' };

registerSpeciesAdapter("Gnome_XPHB", function (s) {
  const specs = [];
  const lineageOptions = buildLineageOptions(s._versions, { parentName: 'Gnome', suffixes: ['Lineage'], expect: Object.values(GNOME_LINEAGE) });
  specs.push({ key: 'species_version', label: 'Gnomish Lineage', type: 'option', options: lineageOptions, count: 1, level: 1 });
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

}

