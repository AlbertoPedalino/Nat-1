import { createAdapterBindings } from '../adapterBindings.js';

export default function install(registry, context = {}) {
  const {
    registerFeatSheetActions,
  } = createAdapterBindings(registry, context);

  // Ravenloft Dark Gift. Perception proficiency + Expertise and Blindsight 15 are
  // parsed from the feat JSON; the remaining benefits are passive reminders.
  if (typeof registerFeatSheetActions === 'function') {
    registerFeatSheetActions('Aberrant Anatomy', []);
  }
}
