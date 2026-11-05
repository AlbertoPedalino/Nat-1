import { createAdapterBindings } from '../adapterBindings.js';

export default function install(registry, context = {}) {
  const { registerFeatSheetEffects } = createAdapterBindings(registry, context);

  if (typeof registerFeatSheetEffects === "function") {
    registerFeatSheetEffects("Alert", [
      { type: "initiativeProficiency", note: "Alert." }
    ]);
  }
}

