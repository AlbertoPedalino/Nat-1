import { createAdapterBindings } from '../adapterBindings.js';

export default function install(registry, context = {}) {
  const {
    _MUSICAL_INSTRUMENTS,
    registerFeatAdapter,
    registerFeatSheetActions,
  } = createAdapterBindings(registry, context);

  if (typeof registerFeatAdapter !== "function") return;

  registerFeatAdapter("Musician", function (feat) {
    return {
      ...feat,
      choiceUi: {
        ...(feat.choiceUi && typeof feat.choiceUi === "object" ? feat.choiceUi : {}),
        instrumentProficiency: {
          keySuffix: "instrument",
          label: "Musical Instrument Proficiency",
          instruments: _MUSICAL_INSTRUMENTS || [],
          count: 3,
        },
      },
    };
  });

  if (typeof registerFeatSheetActions === "function") {
    registerFeatSheetActions("Musician", []);
  }
}
