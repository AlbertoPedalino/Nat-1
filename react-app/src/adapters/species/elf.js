import { createAdapterBindings } from '../adapterBindings.js';

export default function install(registry, context = {}) {
  const {
    registerSpeciesSheetEffects,
    registerSpeciesSheetCommonChoiceMeta,
  } = createAdapterBindings(registry, context);
// The lineage pick comes from the species' versions (speciesVersionChoiceSpec).
registerSpeciesSheetCommonChoiceMeta("Elf_XPHB", {
  labels: {
    species_version: 'Elven Lineage',
    species_spell_ability: 'Spellcasting Ability (Elf)',
  },
});

registerSpeciesSheetEffects("Elf_XPHB", [
  // Fey Ancestry: Advantage on saves to avoid or end the Charmed condition.
  { type: 'advantage', target: 'save', conditions: ['Charmed'], minLevel: 1, note: 'Fey Ancestry' },
  // Drow darkvision 120 ft and Wood Elf Speed 35 come with the lineage's data
  // (speciesVersion.js).
]);

}
