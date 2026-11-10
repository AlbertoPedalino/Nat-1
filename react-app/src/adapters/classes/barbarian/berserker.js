import { createAdapterBindings } from '../../adapterBindings.js';

export default function install(registry, context = {}) {
  const {
    registerSubclassAdapter,
    registerSubclassSheetActions,
    registerSubclassSheetResources,
    registerSubclassSheetEffects,
  } = createAdapterBindings(registry, context);
registerSubclassAdapter("Barbarian_Berserker", function (cls, lv, specs) {});

registerSubclassSheetActions("Barbarian_Berserker", [
  { name: "Frenzy", icon: "", cat: "attack", uses: "With Reckless Attack", minLevel: 3 },
  { name: "Intimidating Presence", icon: "", cat: "bonus", uses: "1 / LR or Rage use", resKey: "barb_intimidating", minLevel: 14 },
]);
registerSubclassSheetResources("Barbarian_Berserker", [
  { key: "barb_intimidating", name: "Intimidating Presence", icon: "skull", recharge: "LR", max: () => 1 },
]);

registerSubclassSheetEffects("Barbarian_Berserker", [

  { type: "rageDamage", minLevel: 3, note: "Frenzy: once per turn while raging, deal extra damage with Reckless Attack." },
  { type: "immunity", conditions: ["Charmed", "Frightened"], minLevel: 6, note: "Mindless Rage while raging.",
    condition: (C) => C?.rageActive === true },
  { type: "reactionAttack", minLevel: 10, note: "Retaliation." },
]);

}

