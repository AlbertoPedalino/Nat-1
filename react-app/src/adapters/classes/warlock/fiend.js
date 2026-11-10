import { createAdapterBindings } from '../../adapterBindings.js';
import { DAMAGE_TYPES } from '../../../shared/content/rulesVocabulary.js';

export default function install(registry, context = {}) {
  const {
    registerSubclassAdapter,
    registerSubclassSheetActions,
    registerSubclassSheetResources,
    registerSubclassSheetEffects,
    registerSubclassRuntimeConfig,
  } = createAdapterBindings(registry, context);

registerSubclassAdapter("Warlock_Fiend", function (cls, lv, specs) {
  if (lv >= 10) {
    specs.push({
      key: "fiend_resilience_damage_type",
      label: "Fiendish Resilience — Damage Type",
      type: "generic_choice",
      // Any damage type but Force (XPHB 2024).
      from: DAMAGE_TYPES.filter((type) => type !== 'Force'),
      count: 1,
      level: 10
    });
  }
});

registerSubclassSheetActions("Warlock_Fiend", [

  { name: "Dark One's Own Luck", icon: "dice-6", cat: "reaction", uses: "CHA mod / LR", resKey: "fiend_luck", minLevel: 6 },
  { name: "Hurl Through Hell", icon: "flame", cat: "action", uses: "1 / LR or Pact Magic slot", resKey: "fiend_hurl", minLevel: 14,
    rollers: [{ kind: 'damage', formula: "8d10", label: "Hurl Through Hell 8d10 Psychic" }] },
]);
registerSubclassSheetEffects("Warlock_Fiend", [
  { type: "resistance-choice", key: "fiend_resilience_damage_type", minLevel: 10, note: "Fiendish Resilience" },
]);

registerSubclassSheetResources("Warlock_Fiend", [
  { key: "fiend_luck", name: "Dark One's Own Luck", icon: "dice-6", recharge: "LR",
    max: 'abilityMod:cha', minMax: 1 },
  { key: "fiend_hurl", name: "Hurl Through Hell", icon: "flame", recharge: "LR", max: () => 1 },
]);

registerSubclassRuntimeConfig("Warlock_Fiend", {
  spellcasting: {
    alwaysPreparedSpells: [
      { name: 'Burning Hands', minLevel: 3, level: 1, source: 'Fiend', sourceType: 'subclass' },
      { name: 'Command', minLevel: 3, level: 1, source: 'Fiend', sourceType: 'subclass' },
      { name: 'Scorching Ray', minLevel: 3, level: 2, source: 'Fiend', sourceType: 'subclass' },
      { name: 'Suggestion', minLevel: 3, level: 2, source: 'Fiend', sourceType: 'subclass' },
      { name: 'Fireball', minLevel: 5, level: 3, source: 'Fiend', sourceType: 'subclass' },
      { name: 'Stinking Cloud', minLevel: 5, level: 3, source: 'Fiend', sourceType: 'subclass' },
      { name: 'Fire Shield', minLevel: 7, level: 4, source: 'Fiend', sourceType: 'subclass' },
      { name: 'Wall of Fire', minLevel: 7, level: 4, source: 'Fiend', sourceType: 'subclass' },
      { name: 'Geas', minLevel: 9, level: 5, source: 'Fiend', sourceType: 'subclass' },
      { name: 'Insect Plague', minLevel: 9, level: 5, source: 'Fiend', sourceType: 'subclass' }
    ],
  },
});

}

