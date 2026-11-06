import { createAdapterBindings } from '../adapterBindings.js';

export default function install(registry, context = {}) {
  const { registerFeatSheetEffects } = createAdapterBindings(registry, context);

  registerFeatSheetEffects("Alert", [
    { type: "initiativeProficiency", note: "Alert." }
  ]);
}

