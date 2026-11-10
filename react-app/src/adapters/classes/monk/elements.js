import { createAdapterBindings } from '../../adapterBindings.js';
import { levelTable, MARTIAL_ARTS_DIE } from '../../classAdapterHelpers.js';
import { saveDcPills } from '../../../shared/character/progression/featureSaveDc.js';

export default function install(registry, context = {}) {
  const {
    registerSubclassAdapter,
    registerSubclassSheetActions,
    registerSubclassSheetEffects,
    registerSubclassRuntimeConfig,
  } = createAdapterBindings(registry, context);
registerSubclassAdapter("Monk_Elements", function (cls, lv, specs) {});

registerSubclassSheetActions("Monk_Elements", [
  { name: "Manipulate Elements", cat: "action", minLevel: 3 },
  { name: "Elemental Attunement", cat: "action", resKey: "ki", minLevel: 3, inlinePills: saveDcPills("wis") },
  { name: "Elemental Burst", cat: "action", resKey: "ki", minLevel: 6,
    rollers: [{ kind: 'damage', formula: ({ ownerLevel }) => `3d${levelTable(ownerLevel, MARTIAL_ARTS_DIE)}`,
      label: ({ formula }) => `${formula} elemental` }],
    inlinePills: saveDcPills("wis") },
]);
registerSubclassRuntimeConfig("Monk_Elements", {
  spellcasting: {
    ability: "wis",
  },
});

registerSubclassSheetEffects("Monk_Elements", [

  { type: "reach", value: 10, minLevel: 3, note: "Elemental Attunement: elemental reach while active." },
  { type: "speed", speedType: "fly", value: "walking", situational: true, minLevel: 11, note: "Stride of the Elements." },
  { type: "resistance", damageTypes: ["Acid", "Cold", "Fire", "Lightning", "Thunder"], minLevel: 17, note: "Elemental Epitome while active." },
]);

}

