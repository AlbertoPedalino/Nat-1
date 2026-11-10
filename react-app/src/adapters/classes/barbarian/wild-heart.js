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

registerSubclassSheetActions("Barbarian_Wild Heart", [
  {
    name: "Animal Speaker",
    cat: "action",
    minLevel: 3
  },
  {
    name: "Rage of the Wilds",
    cat: "bonus",
    minLevel: 3
  },
  {
    name: "Nature Speaker",
    cat: "action",
    minLevel: 10
  },
  {
    name: "Power of the Wilds",
    cat: "bonus",
    minLevel: 14
  }
]);
registerSubclassRuntimeConfig("Barbarian_Wild Heart", {
  spellcasting: {
    ability: "wis",
  },
});

registerSubclassSheetEffects("Barbarian_Wild Heart", [
  { type: "mobility", minLevel: 6, note: "Aspect of the Wilds: animal aspect utility." },
]);

}

