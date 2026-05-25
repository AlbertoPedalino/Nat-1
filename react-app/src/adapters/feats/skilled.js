import { createAdapterBindings } from '../adapterBindings.js';

export default function install(registry, context = {}) {
  const {
    registerFeatAdapter,
    registerFeatSheetActions,
  } = createAdapterBindings(registry, context);

  if (typeof registerFeatAdapter !== 'function') return;

  registerFeatAdapter('Skilled', function (feat) {
    return {
      ...feat,
      entries: [
        'You gain proficiency in any combination of three skills or tools of your choice.',
      ],
      choiceUi: {
        ...(feat.choiceUi && typeof feat.choiceUi === 'object' ? feat.choiceUi : {}),
        skillOrToolProficiency: {
          count: 3,
          label: 'Skilled — Skills or Tools',
        },
      },
    };
  });

  if (typeof registerFeatSheetActions === 'function') {
    registerFeatSheetActions('Skilled', [
      {
        name: 'Skilled',
        icon: 'book-open',
        cat: 'action',
        uses: 'Passive',
        passive: true,
        desc: 'You gain proficiency in any combination of three skills or tools of your choice.',
      },
    ]);
  }
}
