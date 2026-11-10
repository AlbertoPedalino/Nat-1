import { createAdapterBindings } from './adapterBindings.js';

// A feat adapter adding the pick of one damage resistance among `options`
// (stored under the `resistance` choice key, read by a 'resistance-choice'
// effect).
export function withResistanceChoice(options) {
  return (feat) => ({
    ...feat,
    choiceUi: {
      ...(feat.choiceUi || {}),
      damageType: { keySuffix: 'resistance', label: 'Damage Resistance', options },
    },
  });
}

export function installFeatAdapter(registry, context, {
  name,
  adapt,
  actions,
  resources,
  effects,
}) {
  const {
    registerFeatAdapter,
    registerFeatSheetActions,
    registerFeatSheetResources,
    registerFeatSheetEffects,
  } = createAdapterBindings(registry, context);

  if (typeof adapt === 'function') registerFeatAdapter(name, adapt);
  if (Array.isArray(actions)) registerFeatSheetActions(name, actions);
  if (Array.isArray(resources)) registerFeatSheetResources(name, resources);
  if (Array.isArray(effects)) registerFeatSheetEffects(name, effects);
}
