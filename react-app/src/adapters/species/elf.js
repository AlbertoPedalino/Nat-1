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
const ELF_LINEAGE = { DROW: 'Drow', HIGH_ELF: 'High Elf', WOOD_ELF: 'Wood Elf' };

registerSpeciesAdapter("Elf_XPHB", function (s) {
  const specs = [];
  const lineageOptions = buildLineageOptions(s._versions, { parentName: 'Elf', suffixes: ['Lineage'], expect: Object.values(ELF_LINEAGE) });

  specs.push({ key: 'species_version', label: 'Elven Lineage', type: 'option', options: lineageOptions, count: 1, level: 1 });
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
  // Drow darkvision 120 ft and Wood Elf Speed 35 come with the lineage's data
  // (speciesVersion.js).
]);

}
