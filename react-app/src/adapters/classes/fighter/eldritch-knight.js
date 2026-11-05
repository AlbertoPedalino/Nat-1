import { createAdapterBindings } from '../../adapterBindings.js';

export default function install(registry, context = {}) {
  const { registerSubclassAdapter, registerSubclassSheetActions, registerSubclassRuntimeConfig } = createAdapterBindings(registry, context);
registerSubclassRuntimeConfig("Fighter_Eldritch Knight", {
  spellcasting: {
    ability: "int",
    casterProgression: "1/3",
    cantripKnown: [0, 0, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
    spellsKnown: [0, 0, 3, 4, 4, 4, 5, 6, 6, 7, 8, 8, 9, 10, 10, 11, 11, 11, 12, 13],
    preparedSpellsProgression: [0, 0, 3, 4, 4, 4, 5, 6, 6, 7, 8, 8, 9, 10, 10, 11, 11, 11, 12, 13],
    choiceSpellSources: {
      subclass_ek_cantrip_1: { label: "Eldritch Knight", ability: "int" },
      subclass_ek_cantrip_2: { label: "Eldritch Knight", ability: "int" },
    },
  },
});

registerSubclassAdapter("Fighter_Eldritch Knight", function (cls, lv, specs) {
  if (lv >= 3) {
    specs.push({
      key: 'subclass_ek_cantrip_1',
      label: 'Eldritch Knight — Cantrip Wizard 1',
      type: 'spell_choice',
      spellFilter: { spellLevel: 0, classes: ['Wizard'] },
      count: 1,
      level: 3
    });
    specs.push({
      key: 'subclass_ek_cantrip_2',
      label: 'Eldritch Knight — Cantrip Wizard 2',
      type: 'spell_choice',
      spellFilter: { spellLevel: 0, classes: ['Wizard'] },
      count: 1,
      level: 3
    });
  }
});

// [SheetRuntime] START
registerSubclassSheetActions("Fighter_Eldritch Knight", []);
// [SheetRuntime] END

}

