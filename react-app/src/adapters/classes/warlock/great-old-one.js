import { createAdapterBindings } from '../../adapterBindings.js';
import { finalAbilityModifier } from '../../../shared/character/progression/abilityScores.js';
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
  { name: "Awakened Mind", icon: "brain", cat: "bonus", uses: "CHA mod / LR", resKey: "goo_awakened", minLevel: 3,
    inlinePills: ({ ownerLevel, character }) => {
      const lv = Number(ownerLevel || 1);
      const cha = Number(finalAbilityModifier(character, "cha") || 0);
      return [
        { icon: "radio", label: "Range", value: Math.max(1, cha) + " mi" },
        { icon: "clock", label: "Duration", value: lv + " min" },
      ];
    } },
  { name: "Clairvoyant Combatant", icon: "eye", cat: "action", uses: "1 / SR or Pact Magic slot", resKey: "goo_clairvoyant", minLevel: 6 },
  { name: "Create Thrall", icon: "brain", cat: "action", uses: "1 / LR or Pact Magic slot", resKey: "goo_create_thrall", minLevel: 14,
    inlinePills: ({ ownerLevel }) => [{ icon: "shield", label: "Aberration THP", value: Number(ownerLevel || 1) }] },
]);

registerSubclassSheetEffects("Warlock_Great Old One", [
  { type: "telepathy", value: "CHA mod miles", minLevel: 3, note: "Awakened Mind" },
  { type: "combatAdvantage", target: "attack", minLevel: 6, note: "Clairvoyant Combatant: Advantage on attacks vs creature contacted via Awakened Mind; it has Disadvantage on attacks against you." },
  { type: "resistance", damageTypes: ["Psychic"], minLevel: 10, note: "Thought Shield" },
]);
registerSubclassSheetResources("Warlock_Great Old One", [
  { key: "goo_awakened",   name: "Awakened Mind",        icon: "brain", recharge: "LR",
    max: (lv, { cha } = {}) => Math.max(1, cha ?? 0) },
  { key: "goo_clairvoyant", name: "Clairvoyant Combatant", icon: "eye",   recharge: "SR", max: () => 1 },
  { key: "goo_create_thrall", name: "Create Thrall", icon: "brain", recharge: "LR", max: () => 1 },
]);

registerSubclassRuntimeConfig("Warlock_Great Old One", {
  spellcasting: {
    alwaysPreparedSpells: [
      { name: 'Detect Thoughts', minLevel: 3, level: 2, source: 'Great Old One', sourceType: 'subclass' },
      { name: 'Dissonant Whispers', minLevel: 3, level: 1, source: 'Great Old One', sourceType: 'subclass' },
      { name: 'Phantasmal Force', minLevel: 3, level: 2, source: 'Great Old One', sourceType: 'subclass' },
      { name: "Tasha's Hideous Laughter", minLevel: 3, level: 1, source: 'Great Old One', sourceType: 'subclass' },
      { name: 'Clairvoyance', minLevel: 5, level: 3, source: 'Great Old One', sourceType: 'subclass' },
      { name: 'Hunger of Hadar', minLevel: 5, level: 3, source: 'Great Old One', sourceType: 'subclass' },
      { name: 'Confusion', minLevel: 7, level: 4, source: 'Great Old One', sourceType: 'subclass' },
      { name: 'Summon Aberration', minLevel: 7, level: 4, source: 'Great Old One', sourceType: 'subclass' },
      { name: 'Modify Memory', minLevel: 9, level: 5, source: 'Great Old One', sourceType: 'subclass' },
      { name: 'Telekinesis', minLevel: 9, level: 5, source: 'Great Old One', sourceType: 'subclass' },
      // TODO: XPHB lists Hex as innate (free cast) at Lv.10, not alwaysPrepared.
      // Current alwaysPrepared approach is functional but not RAW-perfect.
      // When the system supports innate/free spell grants, move Hex there.
      { name: 'Hex', minLevel: 10, level: 1, source: 'Eldritch Hex', sourceType: 'subclass' }
    ],
  },
});

}

