import { createAdapterBindings } from '../../adapterBindings.js';

export default function install(registry, context = {}) {
  const {
    registerSubclassAdapter,
    registerSubclassSheetActions,
    registerSubclassSheetResources,
    registerSubclassSheetEffects,
    registerSubclassRuntimeConfig,
  } = createAdapterBindings(registry, context);
  const getMod = context?.getMod;
  const getFinal = context?.getFinal;
registerSubclassAdapter("Paladin_Devotion", function (cls, lv, specs) {});

// [SheetRuntime] START
registerSubclassSheetActions("Paladin_Devotion", [
  { name: "Sacred Weapon", icon: "", cat: "action", uses: "1 Channel", resKey: "paladin_channel_div" },
  { name: "Holy Nimbus", icon: "", cat: "bonus", uses: "1 / LR or lv5 slot", resKey: "devotion_holy_nimbus", minLevel: 20,
    inlinePills: ({ ownerLevel, character }) => {
      const cha = typeof getMod === "function" && typeof getFinal === "function"
        ? Number(getMod(getFinal(character, "cha")) || 0) : 0;
      const pb = Math.floor((Number(character?.level || 1) - 1) / 4) + 2;
      return [{ icon: "sun", label: "Radiant/turn", value: cha + pb }];
    } },
]);
registerSubclassSheetResources("Paladin_Devotion", [
  { key: "devotion_holy_nimbus", name: "Holy Nimbus", icon: "sun", recharge: "LR", max: () => 1 },
]);

if (typeof registerSubclassRuntimeConfig === "function") {
  registerSubclassRuntimeConfig("Paladin_Devotion", {
    spellcasting: {
      alwaysPreparedSpells: [
        { name: "Protection from Evil and Good", minLevel: 3, level: 1 },
        { name: "Shield of Faith", minLevel: 3, level: 1 },
        { name: "Aid", minLevel: 5, level: 2 },
        { name: "Zone of Truth", minLevel: 5, level: 2 },
        { name: "Beacon of Hope", minLevel: 9, level: 3 },
        { name: "Dispel Magic", minLevel: 9, level: 3 },
        { name: "Freedom of Movement", minLevel: 13, level: 4 },
        { name: "Guardian of Faith", minLevel: 13, level: 4 },
        { name: "Commune", minLevel: 17, level: 5 },
        { name: "Flame Strike", minLevel: 17, level: 5 }
      ],
    },
  });
}

registerSubclassSheetEffects("Paladin_Devotion", [

  { type: "aura", key: "holy_nimbus", minLevel: 20, note: "Holy Nimbus: bright sunlight aura; enemies in aura take Radiant damage and have Disadvantage against relevant saves while active." },

]);
// [SheetRuntime] END

}

