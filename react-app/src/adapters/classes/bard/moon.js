import { createAdapterBindings } from '../../adapterBindings.js';

export default function install(registry, context = {}) {
  const {
    registerSubclassAdapter,
    registerSubclassSheetActions,
    registerSubclassSheetResources,
    registerSubclassSheetProficiencies,
    registerSubclassSheetEffects,
    registerSubclassRuntimeConfig,
    registerSubclassSheetSpellModifiers,
  } = createAdapterBindings(registry, context);

  registerSubclassAdapter("Bard_Moon", function (cls, lv, specs) {
    if (lv >= 3) {
      specs.push({
        key: "subclass_moon_primal_lore_skill",
        label: "Primal Lore Skill (Moon)",
        type: "skill_choice",
        from: ["Animal Handling", "Insight", "Medicine", "Nature", "Perception", "Survival"],
        count: 1,
        level: 3,
      });
      specs.push({
        key: "subclass_moon_primal_lore_cantrip",
        label: "Primal Lore Cantrip (Moon)",
        type: "spell_choice",
        spellFilter: { spellLevel: 0, classes: ["Druid"] },
        count: 1,
        level: 3,
      });
    }
  });

  registerSubclassSheetActions("Bard_Moon", [
    { name: "Moon's Inspiration", icon: "", cat: "bonus", uses: "With Bardic Insp.", minLevel: 3 },
    { name: "Blessing of Moonlight", icon: "", cat: "action", uses: "1 / LR", resKey: "moon_blessing", minLevel: 6,
      rollers: [{ kind: 'heal', formula: "2d4" }] },
  ]);

  registerSubclassSheetResources("Bard_Moon", [
    { key: "moon_blessing", name: "Blessing of Moonlight", icon: "moon", recharge: "LR", actionName: "Blessing of Moonlight", minLevel: 6, max: 1 },
  ]);

  registerSubclassSheetProficiencies("Bard_Moon", [
    { type: "language", values: ["Druidic"], minLevel: 3 },
  ]);

  registerSubclassSheetEffects("Bard_Moon", [
    { type: "spellModifier", spellName: "Moonbeam", key: "moon_blessing_heal", minLevel: 6,
      note: "Blessing of Moonlight: when a creature fails its save against your Moonbeam, one creature within 60 ft regains 2d4 HP (1/LR)." },
  ]);

  registerSubclassSheetSpellModifiers("Bard_Moon", [
    {
      spellName: "Moonbeam",
      key: "moon_blessing_of_moonlight",
      minLevel: 6,
      note: "Blessing of Moonlight: creature that fails save vs Moonbeam — one creature within 60 ft regains 2d4 HP (1/LR).",
    },
  ]);

  registerSubclassRuntimeConfig("Bard_Moon", {
    spellcasting: {
      alwaysPreparedSpells: [
        { name: "Moonbeam", minLevel: 6, level: 2, source: "Blessing of Moonlight" },
      ],
    },
  });
}
