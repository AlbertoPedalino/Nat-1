import { createAdapterBindings } from '../../adapterBindings.js';

export default function install(registry, context = {}) {
  const {
    registerSubclassAdapter,
    registerSubclassSheetActions,
    registerSubclassSheetResources,
    registerSubclassSheetEffects,
    registerSubclassRuntimeConfig,
  } = createAdapterBindings(registry, context);
registerSubclassAdapter("Paladin_Glory", function (cls, lv, specs) {});

registerSubclassSheetActions("Paladin_Glory", [
  { name: "Inspiring Smite", cat: "bonus", resKey: "paladin_channel_div" },
  { name: "Peerless Athlete", cat: "bonus", resKey: "paladin_channel_div" },
  { name: "Glorious Defense", cat: "reaction", resKey: "glory_glorious_defense", minLevel: 15 },
  { name: "Living Legend", cat: "bonus", resKey: "glory_living_legend", minLevel: 20 },
]);
registerSubclassSheetResources("Paladin_Glory", [
  { key: "glory_glorious_defense", name: "Glorious Defense", recharge: "LR",
    max: 'abilityMod:cha', minMax: 1 },
  { key: "glory_living_legend", name: "Living Legend", recharge: "LR", max: () => 1 },
]);

registerSubclassSheetEffects("Paladin_Glory", [

  { type: "speed", value: 10, minLevel: 7, note: "Aura of Alacrity: your Speed increases by 10 ft; allies in aura gain +10 ft until end of their next turn." },

]);

}

