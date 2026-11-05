import { createAdapterBindings } from '../../adapterBindings.js';

export default function install(registry, context = {}) {
  const { registerSubclassAdapter, registerSubclassSheetActions, registerSubclassSheetResources } = createAdapterBindings(registry, context);
registerSubclassAdapter("Paladin_Vengeance", function (cls, lv, specs, ctx = {}) {});

// [SheetRuntime] START
registerSubclassSheetActions("Paladin_Vengeance", [
  { name: "Vow of Enmity", icon: "", cat: "action", uses: "1 Channel", resKey: "paladin_channel_div" },
  { name: "Soul of Vengeance", icon: "", cat: "reaction", uses: "At will", minLevel: 15 },
  { name: "Avenging Angel", icon: "", cat: "bonus", uses: "1 / LR or lv5 slot", resKey: "vengeance_avenging_angel", minLevel: 20 },
]);
registerSubclassSheetResources("Paladin_Vengeance", [
  { key: "vengeance_avenging_angel", name: "Avenging Angel", icon: "feather", recharge: "LR", max: () => 1 },
]);
// [SheetRuntime] END

}

