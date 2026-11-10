import { createAdapterBindings } from '../adapterBindings.js';

export default function install(registry, context = {}) {
  const { registerFeatSheetActions, registerFeatSheetResources } = createAdapterBindings(registry, context);

  // Ravenloft Dark Gift. Skill and language proficiencies are parsed from the feat
  // JSON; Sustained Symbiosis is a limited-use Reaction that spends a Hit Die.
  registerFeatSheetActions('Symbiotic Being', [
    {
      name: 'Sustained Symbiosis',
      cat: 'reaction',
      resKey: 'symbiotic_sustain',
    },
  ]);

  registerFeatSheetResources('Symbiotic Being', [
    {
      key: 'symbiotic_sustain',
      name: 'Sustained Symbiosis',
      recharge: 'LR',
      max: 'proficiencyBonus',
    },
  ]);
}
