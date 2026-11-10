import { createAdapterBindings } from '../../adapterBindings.js';
import { ABILITY_NAMES } from '../../../shared/content/rulesVocabulary.js';

export default function install(registry, context = {}) {
  const {
    registerSubclassAdapter,
    registerSubclassSheetActions,
    registerSubclassSheetResources,
    registerSubclassSheetEffects,
    registerSubclassRuntimeConfig,
  } = createAdapterBindings(registry, context);

registerSubclassAdapter("Warlock_Great Old One", function (cls, lv, specs) {
  if (lv >= 10) {
    specs.push({
      key: "goo_eldritch_hex_ability",
      label: "Eldritch Hex — Ability for Saving Throw Disadvantage",
      type: "generic_choice",
      from: Object.values(ABILITY_NAMES),
      count: 1,
      level: 10
    });
  }
});

registerSubclassSheetActions("Warlock_Great Old One", [
  { name: "Awakened Mind", cat: "bonus", resKey: "goo_awakened", minLevel: 3 },
  { name: "Clairvoyant Combatant", cat: "action", resKey: "goo_clairvoyant", minLevel: 6 },
  { name: "Create Thrall", cat: "action", resKey: "goo_create_thrall", minLevel: 14,
    inlinePills: ({ ownerLevel }) => [{ label: "Aberration THP", value: Number(ownerLevel || 1) }] },
]);

registerSubclassSheetEffects("Warlock_Great Old One", [
  { type: "telepathy", value: "CHA mod miles", minLevel: 3, note: "Awakened Mind" },
  { type: "resistance", damageTypes: ["Psychic"], minLevel: 10, note: "Thought Shield" },
]);
registerSubclassSheetResources("Warlock_Great Old One", [
  { key: "goo_awakened",   name: "Awakened Mind",        recharge: "LR",
    max: 'abilityMod:cha', minMax: 1 },
  { key: "goo_clairvoyant", name: "Clairvoyant Combatant", recharge: "SR", max: () => 1 },
  { key: "goo_create_thrall", name: "Create Thrall", recharge: "LR", max: () => 1 },
]);

}

