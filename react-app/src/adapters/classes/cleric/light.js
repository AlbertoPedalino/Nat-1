import { createAdapterBindings } from '../../adapterBindings.js';

export default function install(registry, context = {}) {
  const {
    registerSubclassAdapter,
    registerSubclassSheetActions,
    registerSubclassSheetResources,
    registerSubclassSheetEffects,
    registerSubclassRuntimeConfig,
  } = createAdapterBindings(registry, context);
// Light Domain (XPHB): tutte le feature sono passive, nessuna scelta di build.
// L3: Warding Flare, Radiance of the Dawn (CD)
// L6: Improved Warding Flare
// L17: Corona of Light
registerSubclassAdapter("Cleric_Light", function (cls, lv, specs) {
  // nessuna spec
});

registerSubclassSheetActions("Cleric_Light", [
  { name: "Warding Flare", cat: "reaction", resKey: "warding_flare", minLevel: 3 },
  { name: "Improved Warding Flare", cat: "reaction", resKey: "warding_flare", minLevel: 6 },
  { name: "Radiance of the Dawn", cat: "action", resKey: "channel_div",
    rollers: [{ kind: 'damage', formula: ({ ownerLevel }) => {
      const lv = Number(ownerLevel || 1);
      return `2d10+${lv}`;
    }, label: ({ formula }) => `${formula} radiant` }] },
  { name: "Corona of Light", cat: "action", resKey: "corona_light", minLevel: 17 },
]);
registerSubclassSheetResources("Cleric_Light", [
  { key: "warding_flare", name: "Warding Flare", recharge: "SR", srMinLevel: 6,
    max: 'abilityMod:wis', minMax: 1 },
  { key: "corona_light", name: "Corona of Light", recharge: "LR", minLevel: 17,
    max: 'abilityMod:wis', minMax: 1 },
]);
registerSubclassRuntimeConfig("Cleric_Light", {
  spellcasting: {
    alwaysPreparedSpells: [
      { name: "Burning Hands", minLevel: 3, level: 1 },
      { name: "Faerie Fire", minLevel: 3, level: 1 },
      { name: "Scorching Ray", minLevel: 3, level: 2 },
      { name: "See Invisibility", minLevel: 3, level: 2 },
      { name: "Daylight", minLevel: 5, level: 3 },
      { name: "Fireball", minLevel: 5, level: 3 },
      { name: "Arcane Eye", minLevel: 7, level: 4 },
      { name: "Wall of Fire", minLevel: 7, level: 4 },
      { name: "Flame Strike", minLevel: 9, level: 5 },
      { name: "Scrying", minLevel: 9, level: 5 },
    ],
  },
});


}

