import { createAdapterBindings } from '../../adapterBindings.js';

export default function install(registry, context = {}) {
  const {
    registerSubclassAdapter,
    registerSubclassSheetActions,
    registerSubclassSheetResources,
    registerSubclassSheetEffects,
  } = createAdapterBindings(registry, context);
registerSubclassAdapter("Sorcerer_Clockwork Soul", function (cls, lv, specs) {});

registerSubclassSheetActions("Sorcerer_Clockwork Soul", [
  {
    "name": "Restore Balance",
    "icon": "",
    "cat": "reaction",
    "uses": "CHA mod / LR",
    "resKey": "clockwork_restore",
    "minLevel": 3
  },
  {
    "name": "Bastion of Law",
    "icon": "",
    "cat": "action",
    "uses": "1–5 Sorcery Points",
    "resKey": "sorc_pts",
    "minLevel": 6
  },
  {
    "name": "Trance of Order",
    "icon": "",
    "cat": "bonus",
    "uses": "1 / LR",
    "resKey": "clockwork_trance",
    "minLevel": 14
  },
  {
    "name": "Clockwork Cavalcade",
    "icon": "",
    "cat": "action",
    "uses": "1 / LR",
    "resKey": "clockwork_cavalcade",
    "minLevel": 18
  }
]);
registerSubclassSheetResources("Sorcerer_Clockwork Soul", [
  {
    "key": "clockwork_restore",
    "name": "Restore Balance",
    "icon": "settings",
    "recharge": "LR",
    "max": "abilityMod:cha", "minMax": 1
  },
  {
    "key": "clockwork_trance",
    "name": "Trance of Order",
    "icon": "clock",
    "recharge": "LR",
    "max": () => 1
  },
  {
    "key": "clockwork_cavalcade",
    "name": "Clockwork Cavalcade",
    "icon": "cog",
    "recharge": "LR",
    "max": () => 1
  }
]);

registerSubclassSheetEffects("Sorcerer_Clockwork Soul", [

  { type: "d20-floor", minRoll: 10, minLevel: 14, note: "Trance of Order: treat d20 rolls of 9 or lower as 10 while active." },

]);

}

