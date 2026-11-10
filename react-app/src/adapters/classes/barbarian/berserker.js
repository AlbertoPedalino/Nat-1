import { createAdapterBindings } from '../../adapterBindings.js';
import { saveDcPills } from '../../../shared/character/progression/featureSaveDc.js';

export default function install(registry, context = {}) {
  const {
    registerSubclassAdapter,
    registerSubclassSheetActions,
    registerSubclassSheetResources,
    registerSubclassSheetEffects,
  } = createAdapterBindings(registry, context);
registerSubclassAdapter("Barbarian_Berserker", function (cls, lv, specs) {});

registerSubclassSheetActions("Barbarian_Berserker", [
  { name: "Frenzy", cat: "attack", minLevel: 3 },
  { name: "Intimidating Presence", cat: "bonus", resKey: "barb_intimidating", minLevel: 14, inlinePills: saveDcPills("str") },
]);
registerSubclassSheetResources("Barbarian_Berserker", [
  { key: "barb_intimidating", name: "Intimidating Presence", recharge: "LR", max: () => 1 },
]);

registerSubclassSheetEffects("Barbarian_Berserker", [

  { type: "immunity", conditions: ["Charmed", "Frightened"], minLevel: 6, note: "Mindless Rage while raging.",
    condition: (C) => C?.rageActive === true },
]);

}

