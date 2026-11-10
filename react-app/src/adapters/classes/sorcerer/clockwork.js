import { createAdapterBindings } from '../../adapterBindings.js';

export default function install(registry, context = {}) {
  const {
    registerSubclassAdapter,
    registerSubclassSheetActions,
    registerSubclassSheetResources,
    registerSubclassSheetEffects,
  } = createAdapterBindings(registry, context);
registerSubclassAdapter("Sorcerer_Clockwork", function (cls, lv, specs) {});

registerSubclassSheetActions("Sorcerer_Clockwork", [
  {
    "name": "Restore Balance",
    "cat": "reaction",
    "resKey": "clockwork_restore",
    "minLevel": 3
  },
  {
    "name": "Bastion of Law",
    "cat": "action",
    "resKey": "sorc_pts",
    "minLevel": 6
  },
  {
    "name": "Trance of Order",
    "cat": "bonus",
    "resKey": "clockwork_trance",
    "minLevel": 14
  },
  {
    "name": "Clockwork Cavalcade",
    "cat": "action",
    "resKey": "clockwork_cavalcade",
    "minLevel": 18
  }
]);
registerSubclassSheetResources("Sorcerer_Clockwork", [
  {
    "key": "clockwork_restore",
    "name": "Restore Balance",
    "recharge": "LR",
    "max": "abilityMod:cha", "minMax": 1
  },
  {
    "key": "clockwork_trance",
    "name": "Trance of Order",
    "recharge": "LR",
    "max": () => 1
  },
  {
    "key": "clockwork_cavalcade",
    "name": "Clockwork Cavalcade",
    "recharge": "LR",
    "max": () => 1
  }
]);

registerSubclassSheetEffects("Sorcerer_Clockwork", [

  { type: "d20-floor", minRoll: 10, minLevel: 14, note: "Trance of Order: treat d20 rolls of 9 or lower as 10 while active." },

]);

}

