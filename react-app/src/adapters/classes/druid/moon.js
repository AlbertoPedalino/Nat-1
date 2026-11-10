import { createAdapterBindings } from '../../adapterBindings.js';

export default function install(registry, context = {}) {
  const { registerSubclassAdapter, registerSubclassSheetActions, registerSubclassSheetResources, registerSubclassSheetEffects } = createAdapterBindings(registry, context);
registerSubclassAdapter("Druid_Moon", function (cls, lv, specs) {});

registerSubclassSheetActions("Druid_Moon", [
  {
    "name": "Circle Forms",
    "cat": "bonus",
    "resKey": "wild_shape",
    "minLevel": 3
  },
  {
    "name": "Moonlight Step",
    "cat": "bonus",
    "resKey": "moon_moonlight_step",
    "minLevel": 10
  },
  {
    "name": "Lunar Form",
    "cat": "attack",
    "minLevel": 14,
    rollers: [{ kind: 'damage', formula: "2d10", label: ({ formula }) => `+${formula} radiant` }]
  }
]);
// Circle Forms: forms up to CR Druid level / 3, AC at least 13 + Wisdom
// modifier, three times the Druid level in Temporary Hit Points.
registerSubclassSheetEffects("Druid_Moon", [
  { type: "wildShapeRules", minLevel: 3, crDivisor: 3, minAc: { base: 13, ability: "wis" }, tempHpPerLevel: 3, note: "Circle Forms" },
]);

registerSubclassSheetResources("Druid_Moon", [
  {
    "key": "moon_moonlight_step",
    "name": "Moonlight Step",
    "recharge": "LR",
    "max": "abilityMod:wis", "minMax": 1
  }
]);

}

