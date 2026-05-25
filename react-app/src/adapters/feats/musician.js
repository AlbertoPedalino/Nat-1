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
    registerFeatSheetActions("Musician", [
      {
        name: "Musician",
        icon: "music",
        cat: "action",
        uses: "Passive",
        passive: true,
        desc: "You gain proficiency with three Musical Instruments of your choice. When you finish a Short or Long Rest, you can play a song and give Heroic Inspiration to allies who hear it."
      }
    ]);
  }
}
