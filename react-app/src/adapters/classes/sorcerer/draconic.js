import { createAdapterBindings } from '../../adapterBindings.js';

export default function install(registry, context = {}) {
  const {
    registerSubclassAdapter,
    registerSubclassSheetActions,
    registerSubclassSheetResources,
    registerSubclassSheetEffects,
  } = createAdapterBindings(registry, context);
const _DRAGON_ANCESTORS = [
  'Black (Acid)', 'Blue (Lightning)', 'Brass (Fire)', 'Bronze (Lightning)',
  'Copper (Acid)', 'Gold (Fire)', 'Green (Poison)', 'Red (Fire)',
  'Silver (Cold)', 'White (Cold)',
];

registerSubclassAdapter("Sorcerer_Draconic", function (cls, lv, specs) {
  if (lv >= 3) {
    specs.push({
      key: 'subclass_draconic_ancestor',
      label: 'Dragon Ancestor (Draconic Sorcery)',
      type: 'generic_choice',
      from: _DRAGON_ANCESTORS,
      count: 1,
      level: 3
    });
  }
});

registerSubclassSheetActions("Sorcerer_Draconic", [
  {
    "name": "Dragon Wings",
    "icon": "",
    "cat": "bonus",
    "uses": "1 / LR",
    "resKey": "draconic_wings",
    "minLevel": 14
  },
  {
    "name": "Dragon Companion",
    "icon": "",
    "cat": "action",
    "uses": "1 / LR (free slot)",
    "resKey": "draconic_companion",
    "minLevel": 18
  }
]);
registerSubclassSheetResources("Sorcerer_Draconic", [
  {
    "key": "draconic_wings",
    "name": "Dragon Wings",
    "icon": "feather",
    "recharge": "LR",
    "max": () => 1
  },
  {
    "key": "draconic_companion",
    "name": "Dragon Companion (free cast)",
    "icon": "star",
    "recharge": "LR",
    "max": () => 1
  }
]);

registerSubclassSheetEffects("Sorcerer_Draconic", [

  { type: "acFormula", key: "sorcerer_draconic_resilience", label: "Draconic Resilience", base: 10, abilities: ["dex", "cha"], allowShield: false, requiresNoArmor: true, minLevel: 3 },
  { type: "hpBonus", amount: 3, minLevel: 3, perLevelAfter: 1, note: "Draconic Resilience: +3 HP at level 3, +1 per Sorcerer level thereafter." },
  { type: "resistance-choice", key: "subclass_draconic_ancestor", minLevel: 6, note: "Elemental Affinity: resistance based on Dragon Ancestor.",
    map: {
      black: 'Acid', copper: 'Acid',
      blue: 'Lightning', bronze: 'Lightning',
      brass: 'Fire', gold: 'Fire', red: 'Fire',
      green: 'Poison',
      silver: 'Cold', white: 'Cold',
    } },
  { type: "speed", speedType: "fly", value: 60, minLevel: 14, note: "Dragon Wings while active." },

]);

}

