import { createAdapterBindings } from '../adapterBindings.js';

export default function install(registry, context = {}) {
  const {
    registerSpeciesAdapter,
    registerSpeciesSheetEffects,
    registerSpeciesSheetCommonChoiceMeta,
  } = createAdapterBindings(registry, context);

registerSpeciesSheetCommonChoiceMeta("Halfling_XPHB");

// Brave: Advantage on saves to avoid or end the Frightened condition.
registerSpeciesSheetEffects("Halfling_XPHB", [
  { type: 'advantage', target: 'save', conditions: ['Frightened'], minLevel: 1, note: 'Brave' },
]);

}

