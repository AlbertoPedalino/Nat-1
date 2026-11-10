import { createAdapterBindings } from '../../adapterBindings.js';
import { saveDcPills } from '../../../shared/character/progression/featureSaveDc.js';

export default function install(registry, context = {}) {
  const {
    registerSubclassAdapter,
    registerSubclassSheetActions,
    registerSubclassSheetResources,
    registerSubclassSheetEffects,
  } = createAdapterBindings(registry, context);
registerSubclassAdapter("Monk_Open Hand", function (cls, lv, specs) {});

registerSubclassSheetActions("Monk_Open Hand", [
  { name: "Open Hand Technique", cat: "attack", minLevel: 3, inlinePills: saveDcPills("wis") },
  { name: "Wholeness of Body", cat: "bonus", resKey: "open_hand_wholeness", minLevel: 6 },
  { name: "Fleet Step", cat: "bonus", minLevel: 11 },
  { name: "Quivering Palm", cat: "attack", resKey: "ki", minLevel: 17,
    rollers: [{ kind: 'damage', formula: "10d12", label: ({ formula }) => `${formula} force` }],
    inlinePills: saveDcPills("wis") },
]);
registerSubclassSheetResources("Monk_Open Hand", [
  { key: "open_hand_wholeness", name: "Wholeness of Body", recharge: "LR",
    max: 'abilityMod:wis', minMax: 1 },
]);


}
