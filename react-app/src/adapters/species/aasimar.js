import { createAdapterBindings } from '../adapterBindings.js';
import { getProficiencyBonus } from '../../shared/character/progression/proficiency.js';

export default function install(registry, context = {}) {
  const {
    registerSpeciesAdapter,
    registerSpeciesSheetActions,
    registerSpeciesSheetResources,
    registerSpeciesRuntimeConfig,
    registerSpeciesSheetCommonChoiceMeta,
    getGenericSpeciesChoiceSpecs,
  } = createAdapterBindings(registry, context);
registerSpeciesAdapter("Aasimar_XPHB", function (s) {
  let specs = getGenericSpeciesChoiceSpecs(s);
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
    icon: 'cross',
    cat: 'action',
    uses: '1 / LR',
    resKey: 'aasimar_healing_hands',
    rollers: [{ kind: 'heal', formula: ({ character }) => `${getProficiencyBonus(character)}d4` }],
    minLevel: 1,
  },
  {
    name: 'Celestial Revelation',
    icon: '',
    cat: 'bonus',
    uses: '1 / LR',
    resKey: 'aasimar_revelation',
    minLevel: 3,
  },
]);
registerSpeciesSheetResources("Aasimar_XPHB", [
  {
    key: 'aasimar_healing_hands',
    name: 'Healing Hands',
    icon: 'cross',
    recharge: 'LR',
    max: 1,
  },
  {
    key: 'aasimar_revelation',
    name: 'Celestial Revelation',
    icon: 'sparkles',
    recharge: 'LR',
    max: 1,
  },
]);

registerSpeciesRuntimeConfig("Aasimar_XPHB", {
  spellcasting: {
    ability: 'cha',
    alwaysKnownSpells: [
      { name: 'Light', level: 0, source: 'Light Bearer', sourceType: 'species', ability: 'cha' },
    ],
  },
});

}
