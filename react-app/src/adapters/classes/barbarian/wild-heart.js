import { createAdapterBindings } from '../../adapterBindings.js';

export default function install(registry, context = {}) {
  const {
    registerSubclassAdapter,
    registerSubclassSheetActions,
    registerSubclassSheetEffects,
    registerSubclassRuntimeConfig,
  } = createAdapterBindings(registry, context);
registerSubclassAdapter("Barbarian_Wild Heart", function (cls, lv, specs) {
  if (lv >= 6) {
    specs.push({
      key: 'subclass_wild_heart_aspect',
      label: 'Aspect of the Wilds (Wild Heart lv.6)',
      type: 'generic_choice',
      from: ['Owl', 'Panther', 'Salmon'],
      count: 1,
      level: 6
    });
  }
});

// [SheetRuntime] START
registerSubclassSheetActions("Barbarian_Wild Heart", [
  {
    name: "Animal Speaker",
    icon: "",
    cat: "action",
    uses: "Ritual",
    minLevel: 3
  },
  {
    name: "Rage of the Wilds",
    icon: "",
    cat: "bonus",
    uses: "Choose per Rage",
    minLevel: 3
  },
  {
    name: "Nature Speaker",
    icon: "",
    cat: "action",
    uses: "Ritual / LR",
    minLevel: 10
  },
  {
    name: "Power of the Wilds",
    icon: "",
    cat: "bonus",
    uses: "Choose per Rage",
    minLevel: 14
  }
]);
registerSubclassRuntimeConfig("Barbarian_Wild Heart", {
  spellcasting: {
    ability: "wis",
    alwaysPreparedSpells: [
      { name: "Commune with Nature", minLevel: 10, level: 5 },
    ],
  },
});

registerSubclassSheetEffects("Barbarian_Wild Heart", [
  { type: "passiveNote", minLevel: 3, note: "Rage of the Wilds: Bear → Resistance to all damage except Psychic while raging. Eagle/Wolf grant utility, not damage resistance." },
  { type: "mobility", minLevel: 6, note: "Aspect of the Wilds: animal aspect utility." },
  { type: "rageAura", minLevel: 14, note: "Power of the Wilds: enhanced rage aspect." },
]);
// [SheetRuntime] END

}

