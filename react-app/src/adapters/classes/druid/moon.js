import { createAdapterBindings } from '../../adapterBindings.js';

export default function install(registry, context = {}) {
  const { registerSubclassAdapter, registerSubclassSheetActions, registerSubclassSheetResources } = createAdapterBindings(registry, context);
registerSubclassAdapter("Druid_Moon", function (cls, lv, specs) {});

registerSubclassSheetActions("Druid_Moon", [
  {
    "name": "Circle Forms",
    "icon": "",
    "cat": "bonus",
    "uses": "Wild Shape charge",
    "resKey": "wild_shape",
    "minLevel": 3
  },
  {
    "name": "Moonlight Step",
    "icon": "",
    "cat": "bonus",
    "uses": "WIS mod / LR",
    "resKey": "moon_moonlight_step",
    "minLevel": 10
  },
  {
    "name": "Lunar Form",
    "icon": "",
    "cat": "attack",
    "uses": "1 / turn",
    "minLevel": 14,
    rollers: [{ kind: 'damage', formula: "2d10", label: ({ formula }) => `+${formula} radiant` }]
  }
]);
registerSubclassSheetResources("Druid_Moon", [
  {
    "key": "moon_moonlight_step",
    "name": "Moonlight Step",
    "icon": "moon",
    "recharge": "LR",
    "max": (lv, { wis } = {}) => Math.max(1, wis ?? 0)
  }
]);

}

