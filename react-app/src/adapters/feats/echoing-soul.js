import { createAdapterBindings } from '../adapterBindings.js';

export default function install(registry, context = {}) {
  const {
    registerFeatAdapter,
    registerFeatSheetActions,
  } = createAdapterBindings(registry, context);

  if (typeof registerFeatAdapter === 'function') {
    registerFeatAdapter('Echoing Soul', function (feat) {
      return {
        ...feat,
        skillProficiencies: [{ any: 2 }],
        expertise: [{ anyProficientSkill: 1 }],
      };
    });
  }

  if (typeof registerFeatSheetActions === 'function') {
    registerFeatSheetActions('Echoing Soul', [
      {
        name: 'Echoing Soul',
        icon: 'book-open',
        cat: 'action',
        uses: 'Passive',
        passive: true,
        desc: 'Channeled Prowess: proficiency in two skills of your choice, and Expertise in one skill you are proficient in (you can change the Expertise choice on each Long Rest). Inherent Tongues: one additional language. Intrusive Echoes: immediately after you roll a 1 on a D20 Test, make a DC 13 + PB Constitution save or have the Incapacitated condition until the end of your next turn (Speed halved while Incapacitated this way).',
      },
    ]);
  }
}
