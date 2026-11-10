import { createAdapterBindings } from '../adapterBindings.js';

export default function install(registry, context = {}) {
  const {
    registerSpeciesSheetCommonChoiceMeta,
  } = createAdapterBindings(registry, context);
// The lineage pick comes from the species' versions (speciesVersionChoiceSpec).
registerSpeciesSheetCommonChoiceMeta("Tiefling_XPHB", {
  labels: {
    species_version: 'Fiendish Legacy',
    species_spell_ability: 'Spellcasting Ability (Tiefling)',
  },
});
// Each legacy's resistance and Abyssal's darkvision 120 ft come with its data
// (speciesVersion.js).

}
