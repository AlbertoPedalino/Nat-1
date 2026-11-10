import { createAdapterBindings } from '../../adapterBindings.js';

export default function install(registry, context = {}) {
  const {
    registerSubclassAdapter,
    registerSubclassSheetActions,
    registerSubclassSheetResources,
    registerSubclassSheetEffects,
    registerSubclassRuntimeConfig,
  } = createAdapterBindings(registry, context);
registerSubclassAdapter("Ranger_Fey Wanderer", function (cls, lv, specs) {
  if (lv >= 3) {
    specs.push({
      key: 'subclass_fey_wanderer_skill',
      label: 'Otherworldly Glamour — Skill Proficiency',
      type: 'skill_choice',
      from: ['Deception', 'Performance', 'Persuasion'],
      count: 1,
      level: 3
    });
  }
});

registerSubclassSheetActions("Ranger_Fey Wanderer", [
  {
    "name": "Dreadful Strikes",
    "cat": "attack",
    "minLevel": 3,
    rollers: [{ kind: 'damage', formula: ({ ownerLevel }) => Number(ownerLevel || 1) >= 11 ? "1d6" : "1d4", label: ({ formula }) => `+${formula} psychic` }]
  },
  {
    "name": "Beguiling Twist",
    "cat": "reaction",
    "minLevel": 7
  },
  {
    "name": "Fey Reinforcements",
    "cat": "action",
    "resKey": "fey_reinforcements",
    "minLevel": 11
  },
  {
    "name": "Misty Wanderer",
    "cat": "bonus",
    "resKey": "fey_misty_wanderer",
    "minLevel": 15
  }
]);
registerSubclassSheetResources("Ranger_Fey Wanderer", [
  {
    "key": "fey_reinforcements",
    "name": "Fey Reinforcements",
    "recharge": "LR",
    "max": () => 1
  },
  {
    "key": "fey_misty_wanderer",
    "name": "Misty Wanderer",
    "recharge": "LR",
    "max": "abilityMod:wis", "minMax": 1
  }
]);

registerSubclassSheetEffects("Ranger_Fey Wanderer", [

  { type: "skillBonus", ability: "cha", bonusAbility: "wis", minLevel: 3, note: "Otherworldly Glamour: add WIS modifier to CHA checks." },
  { type: "advantage", target: "save", conditions: ["Charmed", "Frightened"], minLevel: 7, note: "Beguiling Twist." },

]);

}

