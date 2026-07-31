import { createAdapterBindings } from '../adapterBindings.js';

export default function install(registry, context = {}) {
  const {
    registerFeatSheetActions,
  } = createAdapterBindings(registry, context);

  // Ravenloft Dark Gift. Perception proficiency + Expertise and Blindsight 15 are
  // parsed from the feat JSON; the remaining benefits are passive reminders.
  if (typeof registerFeatSheetActions === 'function') {
    registerFeatSheetActions('Aberrant Anatomy', [
      {
        name: 'Aberrant Anatomy',
        icon: 'eye',
        cat: 'action',
        uses: 'Passive',
        passive: true,
        desc: 'Breathless: you can hold your breath for 1 hour. Extrasensory Perception: Proficiency and Expertise in Perception, plus Blindsight 15 ft. Warping Flesh: immediately after you roll a 1 on a D20 Test, make a DC 13 + PB Constitution save or have the Stunned condition until the end of your next turn.',
      },
    ]);
  }
}
