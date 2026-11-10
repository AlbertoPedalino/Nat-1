import { createAdapterBindings } from '../../adapterBindings.js';

export default function install(registry, context = {}) {
  const {
    _ARTISAN_TOOLS,
    registerSubclassAdapter,
    registerSubclassSheetActions,
    registerSubclassSheetResources,
    registerSubclassSheetEffects,
    registerSubclassRuntimeConfig,
  } = createAdapterBindings(registry, context);
registerSubclassAdapter("Cleric_Knowledge", function (cls, lv, specs) {
  if (lv >= 3) {
    specs.push({
      key: 'subclass_knowledge_skills',
      label: 'Blessings of Knowledge — Skill Proficiency',
      type: 'skill_choice',
      from: ['Arcana', 'History', 'Nature', 'Religion'],
      count: 2,
      level: 3
    });
    specs.push({
      key: 'subclass_knowledge_tool',
      label: 'Blessings of Knowledge — Artisan\'s Tool',
      type: 'generic_choice',
      from: _ARTISAN_TOOLS || [],
      count: 1,
      level: 3
    });
  }
});

registerSubclassSheetActions("Cleric_Knowledge", [
  {
    "name": "Mind Magic",
    "cat": "action",
    "resKey": "channel_div"
  },
  {
    "name": "Divine Foreknowledge",
    "cat": "bonus",
    "resKey": "divine_foreknowledge",
    "minLevel": 17
  }
]);
registerSubclassRuntimeConfig("Cleric_Knowledge", {
  spellcasting: {
    alwaysPreparedSpells: [
      { name: "Command", minLevel: 3, level: 1 },
      { name: "Comprehend Languages", minLevel: 3, level: 1 },
      { name: "Detect Magic", minLevel: 3, level: 1 },
      { name: "Detect Thoughts", minLevel: 3, level: 2 },
      { name: "Identify", minLevel: 3, level: 1 },
      { name: "Mind Spike", minLevel: 3, level: 2 },
      { name: "Dispel Magic", minLevel: 5, level: 3 },
      { name: "Nondetection", minLevel: 5, level: 3 },
      { name: "Tongues", minLevel: 5, level: 3 },
      { name: "Arcane Eye", minLevel: 7, level: 4 },
      { name: "Banishment", minLevel: 7, level: 4 },
      { name: "Confusion", minLevel: 7, level: 4 },
      { name: "Legend Lore", minLevel: 9, level: 5 },
      { name: "Scrying", minLevel: 9, level: 5 },
      { name: "Synaptic Static", minLevel: 9, level: 5 },
    ],
  },
});

registerSubclassSheetEffects("Cleric_Knowledge", [

  { type: "advantage", target: "d20Tests", minLevel: 17, note: "Divine Foreknowledge: BA, 1 hour Advantage on all D20 Tests." },
]);
registerSubclassSheetResources("Cleric_Knowledge", [
  { key: "divine_foreknowledge", name: "Divine Foreknowledge", recharge: "LR",
    minLevel: 17, max: 1 },
]);

}

