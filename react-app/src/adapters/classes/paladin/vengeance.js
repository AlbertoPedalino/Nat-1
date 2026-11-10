import { createAdapterBindings } from '../../adapterBindings.js';

export default function install(registry, context = {}) {
  const { registerSubclassAdapter, registerSubclassSheetActions, registerSubclassSheetResources } = createAdapterBindings(registry, context);
registerSubclassAdapter("Paladin_Vengeance", function (cls, lv, specs, ctx = {}) {});

registerSubclassSheetActions("Paladin_Vengeance", [
  { name: "Vow of Enmity", cat: "action", resKey: "paladin_channel_div" },
  { name: "Soul of Vengeance", cat: "reaction", minLevel: 15 },
  { name: "Avenging Angel", cat: "bonus", resKey: "vengeance_avenging_angel", minLevel: 20 },
]);
registerSubclassSheetResources("Paladin_Vengeance", [
  { key: "vengeance_avenging_angel", name: "Avenging Angel", recharge: "LR", max: () => 1 },
]);

}

