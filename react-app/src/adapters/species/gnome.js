import { createAdapterBindings } from '../adapterBindings.js';

export default function install(registry, context = {}) {
  const {
    registerSpeciesSheetEffects,
    registerSpeciesSheetCommonChoiceMeta,
  } = createAdapterBindings(registry, context);
// The lineage pick comes from the species' versions (speciesVersionChoiceSpec).
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

