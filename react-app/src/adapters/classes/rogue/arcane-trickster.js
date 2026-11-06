import { createAdapterBindings } from '../../adapterBindings.js';

export default function install(registry, context = {}) {
  const {
    registerSubclassAdapter,
    registerSubclassSheetActions,
    registerSubclassSheetResources,
    registerSubclassRuntimeConfig,
  } = createAdapterBindings(registry, context);
registerSubclassRuntimeConfig("Rogue_Arcane Trickster", {
  spellcasting: {
    ability: "int",
    casterProgression: "1/3",
    cantripKnown: [0, 0, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
    spellsKnown: [0, 0, 3, 4, 4, 4, 5, 6, 6, 7, 8, 8, 9, 10, 10, 11, 11, 11, 12, 13],
    preparedSpellsProgression: [0, 0, 3, 4, 4, 4, 5, 6, 6, 7, 8, 8, 9, 10, 10, 11, 11, 11, 12, 13],
    choiceSpellSources: {
      subclass_at_cantrip_1: { label: "Arcane Trickster", ability: "int" },
      subclass_at_cantrip_2: { label: "Arcane Trickster", ability: "int" },
    },
  },
});

registerSubclassAdapter("Rogue_Arcane Trickster", function (cls, lv, specs) {
  if (lv >= 3) {
    specs.push({
      key: "subclass_at_cantrip_1",
      label: "Arcane Trickster - Cantrip Wizard 1",
      type: "spell_choice",
      spellFilter: { spellLevel: 0, classes: ["Wizard"] },
      count: 1,
      level: 3
    });
    specs.push({
      key: "subclass_at_cantrip_2",
      label: "Arcane Trickster - Cantrip Wizard 2",
      type: "spell_choice",
      spellFilter: { spellLevel: 0, classes: ["Wizard"] },
      count: 1,
      level: 3
    });
  }
});

registerSubclassSheetActions("Rogue_Arcane Trickster", [
  {
    "name": "Mage Hand Legerdemain",
    "icon": "",
    "cat": "bonus",
    "uses": "Unlimited",
    "minLevel": 3
  },
  {
    "name": "Versatile Trickster",
    "icon": "",
    "cat": "action",
    "uses": "Cunning Strike option",
    "minLevel": 13
  },
  {
    "name": "Spell Thief",
    "icon": "",
    "cat": "reaction",
    "uses": "1 / LR",
    "resKey": "spell_thief",
    "minLevel": 17
  }
]);
registerSubclassSheetResources("Rogue_Arcane Trickster", [
  {
    "key": "spell_thief",
    "name": "Spell Thief",
    "icon": "wand",
    "recharge": "LR",
    "max": () => 1
  }
]);

}

