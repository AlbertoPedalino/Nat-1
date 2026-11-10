import { createAdapterBindings } from '../../adapterBindings.js';

export default function install(registry, context = {}) {
  const {
    registerSubclassAdapter,
    registerSubclassSheetActions,
    registerSubclassSheetResources,
    registerSubclassSheetEffects,
    registerSubclassRuntimeConfig,
  } = createAdapterBindings(registry, context);
registerSubclassAdapter("Warlock_Archfey", function (cls, lv, specs) {});

registerSubclassSheetActions("Warlock_Archfey", [
  { name: "Steps of the Fey", icon: "sparkles", cat: "bonus", uses: "CHA mod / LR", resKey: "archfey_steps", minLevel: 3,
    rollers: [{ kind: 'tempHp', formula: "1d10" }] },
  { name: "Misty Escape", icon: "sparkles", cat: "reaction", uses: "Pact Magic slot", minLevel: 6,
    rollers: [{ kind: 'damage', formula: "2d10", label: "Fey Curse 2d10 Psychic" }] },
  { name: "Beguiling Defenses", icon: "shield", cat: "reaction", uses: "1 / LR or Pact Magic slot", resKey: "archfey_beguiling", minLevel: 10 },
  { name: "Bewitching Magic", icon: "sparkles", cat: "action", uses: "After enchantment/illusion", minLevel: 14 },
]);

registerSubclassSheetEffects("Warlock_Archfey", [
  { type: "conditionImmunity", conditions: ["Charmed"], minLevel: 10, note: "Beguiling Defenses" },
]);
registerSubclassSheetResources("Warlock_Archfey", [
  { key: "archfey_steps",    name: "Steps of the Fey",    icon: "sparkles", recharge: "LR",
    max: 'abilityMod:cha', minMax: 1 },
  { key: "archfey_beguiling", name: "Beguiling Defenses", icon: "shield",   recharge: "LR", max: () => 1 },
]);

registerSubclassRuntimeConfig("Warlock_Archfey", {
  spellcasting: {
    alwaysPreparedSpells: [
      { name: 'Calm Emotions', minLevel: 3, level: 2, source: 'Archfey', sourceType: 'subclass' },
      { name: 'Faerie Fire', minLevel: 3, level: 1, source: 'Archfey', sourceType: 'subclass' },
      { name: 'Misty Step', minLevel: 3, level: 2, source: 'Archfey', sourceType: 'subclass' },
      { name: 'Phantasmal Force', minLevel: 3, level: 2, source: 'Archfey', sourceType: 'subclass' },
      { name: 'Sleep', minLevel: 3, level: 1, source: 'Archfey', sourceType: 'subclass' },
      { name: 'Blink', minLevel: 5, level: 3, source: 'Archfey', sourceType: 'subclass' },
      { name: 'Plant Growth', minLevel: 5, level: 3, source: 'Archfey', sourceType: 'subclass' },
      { name: 'Dominate Beast', minLevel: 7, level: 4, source: 'Archfey', sourceType: 'subclass' },
      { name: 'Greater Invisibility', minLevel: 7, level: 4, source: 'Archfey', sourceType: 'subclass' },
      { name: 'Dominate Person', minLevel: 9, level: 5, source: 'Archfey', sourceType: 'subclass' },
      { name: 'Seeming', minLevel: 9, level: 5, source: 'Archfey', sourceType: 'subclass' }
    ],
  },
});

}

