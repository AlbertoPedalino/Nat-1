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
    { key: "moon_blessing", name: "Blessing of Moonlight", icon: "moon", recharge: "LR", actionName: "Blessing of Moonlight", max: (lv) => lv >= 6 ? 1 : 0 },
  ]);

  registerSubclassSheetProficiencies("Bard_Moon", [
    { type: "language", values: ["Druidic"], minLevel: 3 },
  ]);

  registerSubclassSheetEffects("Bard_Moon", [
    { type: "healingSpellModifier", key: "moon_lunar_vitality", minLevel: 3,
      note: "Lunar Vitality: once per turn when you restore HP with a spell, expend Bardic Inspiration to add the BI die to the healing. Target gains +10 ft Speed until end of your next turn." },
    { type: "spellModifier", spellName: "Moonbeam", key: "moon_blessing_heal", minLevel: 6,
      note: "Blessing of Moonlight: when a creature fails its save against your Moonbeam, one creature within 60 ft regains 2d4 HP (1/LR)." },
    { type: "passiveUpgrade", key: "moon_eventide_splendor", minLevel: 14,
      note: "Eventide's Splendor: Inspired Eclipse also affects BI target. Lunar Vitality can roll 1d6 without expending BI." },
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
