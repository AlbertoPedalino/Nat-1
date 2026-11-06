import { createAdapterBindings } from '../../adapterBindings.js';

export default function install(registry, context = {}) {
  const { registerSubclassAdapter, registerSubclassSheetActions, registerSubclassSheetResources } = createAdapterBindings(registry, context);
registerSubclassAdapter("Ranger_Winter Walker", function (cls, lv, specs) {});

registerSubclassSheetActions("Ranger_Winter Walker", [
  {
    "name": "Fortifying Soul",
    "icon": "",
    "cat": "action",
    "uses": "1 / LR",
    "resKey": "winter_walker_fortify",
    "minLevel": 7
  },
  {
    "name": "Chilling Retribution",
    "icon": "",
    "cat": "reaction",
    "uses": "WIS mod / LR",
    "resKey": "winter_walker_retribution",
    "minLevel": 11
  },
  {
    "name": "Frozen Haunt",
    "icon": "",
    "cat": "action",
    "uses": "1 / LR",
    "resKey": "winter_walker_haunt",
    "minLevel": 15
  }
]);
registerSubclassSheetResources("Ranger_Winter Walker", [
  {
    "key": "winter_walker_fortify",
    "name": "Fortifying Soul",
    "icon": "heart",
    "recharge": "LR",
    "max": () => 1
  },
  {
    "key": "winter_walker_retribution",
    "name": "Chilling Retribution",
    "icon": "zap",
    "recharge": "LR",
    "max": (lv, { wis } = {}) => Math.max(1, wis ?? 0)
  },
  {
    "key": "winter_walker_haunt",
    "name": "Frozen Haunt",
    "icon": "eye-off",
    "recharge": "LR",
    "max": () => 1
  }
]);

}

