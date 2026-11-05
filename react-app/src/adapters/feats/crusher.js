import { createAdapterBindings } from '../adapterBindings.js';

export default function install(registry, context = {}) {
  const { registerFeatSheetActions } = createAdapterBindings(registry, context);


  if (typeof registerFeatSheetActions === "function") {
    registerFeatSheetActions("Crusher", []);
  }

}

