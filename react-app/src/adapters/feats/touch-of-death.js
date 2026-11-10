import { createAdapterBindings } from '../adapterBindings.js';

export default function install(registry, context = {}) {
  const { registerFeatAdapter } = createAdapterBindings(registry, context);

  // Ravenloft Dark Gift. Chill Touch (no components, Necrotic ignores Resistance)
  // is granted from the feat JSON additionalSpells. Pull of the Grave is a
  // passive drawback.
  registerFeatAdapter('Touch of Death', function (feat) {
    return {
      ...feat,
      spellGrantOverrides: {
        'Chill Touch': {
          spell: { components: 'none' },
          modifiers: [{
            key: 'touch-of-death-resistance',
            tagLabel: 'Ignore Resistance',
            detailTitle: 'Touch of Death',
            detailText: 'The spell\'s Necrotic damage ignores Resistance.',
          }],
        },
      },
    };
  });

}
