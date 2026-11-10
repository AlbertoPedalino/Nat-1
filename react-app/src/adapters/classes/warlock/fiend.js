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

  { name: "Dark One's Own Luck", cat: "reaction", resKey: "fiend_luck", minLevel: 6 },
  { name: "Hurl Through Hell", cat: "action", resKey: "fiend_hurl", minLevel: 14,
    rollers: [{ kind: 'damage', formula: "8d10", label: "Hurl Through Hell 8d10 Psychic" }] },
]);
registerSubclassSheetEffects("Warlock_Fiend", [
  { type: "resistance-choice", key: "fiend_resilience_damage_type", minLevel: 10, note: "Fiendish Resilience" },
]);

registerSubclassSheetResources("Warlock_Fiend", [
  { key: "fiend_luck", name: "Dark One's Own Luck", recharge: "LR",
    max: 'abilityMod:cha', minMax: 1 },
  { key: "fiend_hurl", name: "Hurl Through Hell", recharge: "LR", max: () => 1 },
]);

}

