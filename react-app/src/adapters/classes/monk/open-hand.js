import { createAdapterBindings } from '../../adapterBindings.js';

export default function install(registry, context = {}) {
  const {
    registerSubclassAdapter,
    registerSubclassSheetActions,
    registerSubclassSheetResources,
    registerSubclassSheetEffects,
  } = createAdapterBindings(registry, context);
registerSubclassAdapter("Monk_Open Hand", function (cls, lv, specs) {});

registerSubclassSheetActions("Monk_Open Hand", [
  { name: "Open Hand Technique", icon: "", cat: "attack", uses: "With Flurry", minLevel: 3 },
  { name: "Wholeness of Body", icon: "", cat: "bonus", uses: "WIS mod / LR", resKey: "open_hand_wholeness", minLevel: 6 },
  { name: "Fleet Step", icon: "", cat: "bonus", uses: "After any Bonus Action", minLevel: 11 },
  { name: "Quivering Palm", icon: "", cat: "attack", uses: "4 Focus Points", resKey: "ki", minLevel: 17,
    rollers: [{ kind: 'damage', formula: "10d12", label: ({ formula }) => `${formula} force` }] },
]);
registerSubclassSheetResources("Monk_Open Hand", [
  { key: "open_hand_wholeness", name: "Wholeness of Body", icon: "heart", recharge: "LR",
    max: 'abilityMod:wis', minMax: 1 },
]);


}

