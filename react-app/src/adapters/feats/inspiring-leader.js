import { createAdapterBindings } from '../adapterBindings.js';

export default function install(registry, context = {}) {
  const { registerFeatSheetActions, registerFeatSheetResources } = createAdapterBindings(registry, context);


  if (typeof registerFeatSheetResources === "function") {
    registerFeatSheetResources("Inspiring Leader", [
      {
        key: "inspiring_speech",
        name: "Inspiring Speech",
        icon: "mic",
        recharge: "LR",
        max: function () { return 1; }
      }
    ]);
  }

  if (typeof registerFeatSheetActions === "function") {
    registerFeatSheetActions("Inspiring Leader", [
      {
        name: "Inspiring Speech",
        icon: "mic",
        cat: "action",
        resKey: "inspiring_speech"
      }
    ]);
  }

}

