import { createAdapterBindings } from '../adapterBindings.js';

export default function install(registry, context = {}) {
  const {
    registerFeatSheetActions,
    registerFeatSheetResources,
  } = createAdapterBindings(registry, context);

  // Ravenloft Dark Gift. Skill and language proficiencies are parsed from the feat
  // JSON; Sustained Symbiosis is a limited-use Reaction that spends a Hit Die.
  if (typeof registerFeatSheetActions === 'function') {
    registerFeatSheetActions('Symbiotic Being', [
      {
        name: 'Sustained Symbiosis',
        icon: 'heart',
        cat: 'reaction',
        uses: 'PB / LR',
        resKey: 'symbiotic_sustain',
      },
    ]);
  }

  if (typeof registerFeatSheetResources === 'function') {
    registerFeatSheetResources('Symbiotic Being', [
      {
        key: 'symbiotic_sustain',
        name: 'Sustained Symbiosis',
        icon: 'heart',
        recharge: 'LR',
        max: 'proficiencyBonus',
      },
    ]);
  }
}
