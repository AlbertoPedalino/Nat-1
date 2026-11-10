import { createAdapterBindings } from '../adapterBindings.js';
import { saveDcPills } from '../../shared/character/progression/featureSaveDc.js';
import { getProficiencyBonus } from '../../shared/character/progression/proficiency.js';

export default function install(registry, context = {}) {
  const {
    registerSpeciesAdapter,
    registerSpeciesSheetActions,
    registerSpeciesSheetResources,
    registerSpeciesSheetCommonChoiceMeta,
  } = createAdapterBindings(registry, context);
registerSpeciesAdapter("Aasimar_XPHB", function (s) {
  let specs = [];
  // Aasimar XPHB has fixed Celestial Resistance; avoid showing it as a build choice.
  // Also remove a generic size spec, if parsed from the raw JSON, so we do not show it twice.
  specs = specs.filter(function (x) {
    return !String(x.key || '').startsWith('species_resist') && x.key !== 'species_size';
  });

  specs.push({ key: 'species_size', label: 'Choose Size', type: 'generic_choice', from: ['Medium', 'Small'], count: 1, level: 1 });
  return specs;
});

registerSpeciesSheetCommonChoiceMeta("Aasimar_XPHB", {
  labels: {
    species_size: 'Size',
  },
});
registerSpeciesSheetActions("Aasimar_XPHB", [
  {
    name: 'Healing Hands',
    cat: 'action',
    resKey: 'aasimar_healing_hands',
    rollers: [{ kind: 'heal', formula: ({ character }) => `${getProficiencyBonus(character)}d4` }],
    minLevel: 1,
  },
  {
    name: 'Celestial Revelation',
    cat: 'bonus',
    resKey: 'aasimar_revelation',
    minLevel: 3,
    // Necrotic Shroud's Charisma save.
    inlinePills: saveDcPills('cha'),
  },
]);
registerSpeciesSheetResources("Aasimar_XPHB", [
  {
    key: 'aasimar_healing_hands',
    name: 'Healing Hands',
    recharge: 'LR',
    max: 1,
  },
  {
    key: 'aasimar_revelation',
    name: 'Celestial Revelation',
    recharge: 'LR',
    max: 1,
  },
]);

}
