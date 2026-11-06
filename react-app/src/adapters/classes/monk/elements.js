import { createAdapterBindings } from '../../adapterBindings.js';

export default function install(registry, context = {}) {
  const {
    registerSubclassAdapter,
    registerSubclassSheetActions,
    registerSubclassSheetEffects,
    registerSubclassRuntimeConfig,
  } = createAdapterBindings(registry, context);
registerSubclassAdapter("Monk_Elements", function (cls, lv, specs) {});

registerSubclassSheetActions("Monk_Elements", [
  { name: "Manipulate Elements", icon: "", cat: "action", uses: "At will", minLevel: 3 },
  { name: "Elemental Attunement", icon: "", cat: "action", uses: "1 Focus Point", resKey: "ki", minLevel: 3 },
  { name: "Elemental Burst", icon: "", cat: "action", uses: "2 Focus Points", resKey: "ki", minLevel: 6,
    rollers: [{ kind: 'damage', formula: ({ ownerLevel }) => {
      const lv = Number(ownerLevel || 1);
      const die = lv >= 17 ? 12 : lv >= 11 ? 10 : lv >= 5 ? 8 : 6;
      return `3d${die}`;
    }, label: ({ formula }) => `${formula} elemental` }] },
]);
registerSubclassRuntimeConfig("Monk_Elements", {
  spellcasting: {
    ability: "wis",
    alwaysKnownSpells: [
      { name: "Elementalism", minLevel: 3, level: 0 },
    ],
  },
});

registerSubclassSheetEffects("Monk_Elements", [

  { type: "reach", value: 10, minLevel: 3, note: "Elemental Attunement: elemental reach while active." },
  { type: "damageTypeChoice", values: ["Acid", "Cold", "Fire", "Lightning", "Thunder"], minLevel: 3, note: "Elemental Attunement." },
  { type: "flySpeed", minLevel: 11, note: "Stride of the Elements." },
  { type: "resistance", damageTypes: ["Acid", "Cold", "Fire", "Lightning", "Thunder"], minLevel: 17, note: "Elemental Epitome while active." },
]);

}

