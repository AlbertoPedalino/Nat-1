import { createAdapterBindings } from '../../adapterBindings.js';

export default function install(registry, context = {}) {
  const {
    SKILLS,
    _ARTISAN_TOOLS,
    _MUSICAL_INSTRUMENTS,
    _GAMING_SETS,
    _VEHICLE_TOOLS,
    _STD_LANGS,
    _EXOTIC_LANGS,
    _ALL_LANGS,
    _ALL_TOOLS,
    allItemsDb,
    registerClassAdapter,
    getClassAdapter,
    registerSubclassAdapter,
    getSubclassAdapter,
    registerSpeciesAdapter,
    getSpeciesAdapter,
    registerFeatAdapter,
    getFeatAdapter,
    registerClassSheetActions,
    getClassSheetActions,
    registerSubclassSheetActions,
    getSubclassSheetActions,
    registerSpeciesSheetActions,
    getSpeciesSheetActions,
    registerFeatSheetActions,
    getFeatSheetActions,
    registerClassSheetResources,
    getClassSheetResources,
    registerSubclassSheetResources,
    getSubclassSheetResources,
    registerSpeciesSheetResources,
    getSpeciesSheetResources,
    registerFeatSheetResources,
    getFeatSheetResources,
    registerClassSheetEffects,
    getClassSheetEffects,
    registerSubclassSheetEffects,
    getSubclassSheetEffects,
    registerSpeciesSheetEffects,
    getSpeciesSheetEffects,
    registerFeatSheetEffects,
    getFeatSheetEffects,
    registerClassRuntimeConfig,
    getClassRuntimeConfig,
    registerSubclassRuntimeConfig,
    getSubclassRuntimeConfig,
    registerSpeciesRuntimeConfig,
    getSpeciesRuntimeConfig,
    registerClassSheetChoiceMeta,
    getClassSheetChoiceMeta,
    registerSubclassSheetChoiceMeta,
    getSubclassSheetChoiceMeta,
    registerSpeciesSheetChoiceMeta,
    getSpeciesSheetChoiceMeta,
    registerClassSheetCommonChoiceMeta,
    registerSubclassSheetCommonChoiceMeta,
    registerSpeciesSheetCommonChoiceMeta,
    registerItemFlagDef,
    getItemFlagDef,
    getAllItemFlagDefs,
    registerWeaponAbilityOverride,
    getWeaponAbilityOverrides,
    registerClassSheetFeatureFilter,
    getClassSheetFeatureFilters,
    registerSubclassSheetFeatureFilter,
    getSubclassSheetFeatureFilters,
    registerSpeciesSheetFeatureFilter,
    getSpeciesSheetFeatureFilters,
    registerClassSheetProficiencies,
    getClassSheetProficiencies,
    registerSubclassSheetProficiencies,
    getSubclassSheetProficiencies,
    registerSpeciesSheetProficiencies,
    getSpeciesSheetProficiencies,
    registerClassSheetSpellModifiers,
    getClassSheetSpellModifiers,
    registerSubclassSheetSpellModifiers,
    getSubclassSheetSpellModifiers,
    registerSpeciesSheetSpellModifiers,
    getSpeciesSheetSpellModifiers,
    registerClassChoiceKeyFilter,
    getClassChoiceKeyFilter,
    registerClassChoiceLabelProvider,
    getClassChoiceLabelProvider,
    registerSpeciesSheetHpBonus,
    getSpeciesSheetHpBonus,
    registerClassAtWillSpells,
    getClassAtWillSpells,
    registerSpeciesLongRestGrants,
    getSpeciesLongRestGrants,
    registerResourceSideEffect,
    getResourceSideEffect,
    registerSubclassChoiceDetailDataProvider,
    getSubclassChoiceDetailDataProvider,
    registerGlobalClassAdapter,
    getGlobalClassAdapters,
    registerGlobalSubclassAdapter,
    getGlobalSubclassAdapters,
    registerGlobalSpeciesAdapter,
    getGlobalSpeciesAdapters,
    registerGlobalFeatAdapter,
    getGlobalFeatAdapters,
    registerGlobalSpellAdapter,
    getGlobalSpellAdapters,
    registerGlobalItemAdapter,
    getGlobalItemAdapters,
    registerCantripData,
    getCantripData,
    registerCantripDataModifier,
    getCantripDataModifiers,
    registerSpellData,
    getSpellData,
    getGenericSpeciesChoiceSpecs,
    getGenericBackgroundChoiceSpecs,
    getGenericBackgroundChoiceMeta,
    getGenericBackgroundOriginFeat,
  } = createAdapterBindings(registry, context);
  const getMod = context?.getMod;
  const getFinal = context?.getFinal;

function gooChoice(C, key) {
  if (!C?.choices) return null;
  if (C.choices[key] != null) return C.choices[key];
  const found = Object.entries(C.choices).find(([choiceKey]) => choiceKey.replace(/^mc\d+_/, '') === key);
  return found ? found[1] : null;
}
registerSubclassAdapter("Warlock_Great Old One", function (cls, lv, specs) {
  if (lv >= 10) {
    specs.push({
      key: "goo_eldritch_hex_ability",
      label: "Eldritch Hex — Ability for Saving Throw Disadvantage",
      type: "generic_choice",
      from: ["Strength", "Dexterity", "Constitution", "Intelligence", "Wisdom", "Charisma"],
      count: 1,
      level: 10
    });
  }
});

// [SheetRuntime] START
registerSubclassSheetActions("Warlock_Great Old One", [
  { name: "Awakened Mind", icon: "brain", cat: "bonus", uses: "CHA mod / LR", resKey: "goo_awakened", minLevel: 3,
    inlinePills: ({ ownerLevel, character }) => {
      const lv = Number(ownerLevel || 1);
      const cha = typeof getMod === "function" && typeof getFinal === "function"
        ? Number(getMod(getFinal(character, "cha")) || 0) : 0;
      return [
        { icon: "radio", label: "Range", value: Math.max(1, cha) + " mi" },
        { icon: "clock", label: "Duration", value: lv + " min" },
      ];
    },
    desc: "Bonus Action: choose one creature you can see within CHA modifier miles. You can communicate telepathically for a number of minutes equal to your Warlock level. The target needn't share a language, but it must know at least one language. Recharge: Long Rest." },
  { name: "Psychic Spells", icon: "brain", cat: "action", uses: "Passive", minLevel: 3,
  passive: true,
    desc: "When you cast a Warlock spell that deals damage, you can change its damage type to Psychic. When you cast a Warlock spell from the Enchantment or Illusion school, you can cast it without Verbal or Somatic components." },
  { name: "Clairvoyant Combatant", icon: "eye", cat: "action", uses: "1 / SR or Pact Magic slot", resKey: "goo_clairvoyant", minLevel: 6,
    desc: "When you establish telepathic contact with a creature using Awakened Mind, force it to make a WIS save. On failure, it has Disadvantage on attack rolls against you, and you have Advantage on attack rolls against it, until the telepathic contact ends. Recharge: Short/Long Rest, or expend a Pact Magic slot." },
  { name: "Eldritch Hex", icon: "hexagon", cat: "action", uses: "Passive", minLevel: 10,
  passive: true,
    inlinePills: ({ character }) => [{ icon: "hexagon", label: "Save Disadvantage", value: String(gooChoice(character, "goo_eldritch_hex_ability") || "Choose") }],
    desc: "Hex is always prepared and doesn't count against your number of spells prepared. When you cast Hex and choose an ability, the Hexed creature also has Disadvantage on saving throws using that ability for the duration." },
  { name: "Thought Shield", icon: "shield", cat: "reaction", uses: "Passive", minLevel: 10,
  passive: true,
    desc: "You have Resistance to Psychic damage. In addition, when a creature deals Psychic damage to you, that creature takes the same amount of Psychic damage that you do." },
  { name: "Create Thrall", icon: "brain", cat: "action", uses: "1 / LR or Pact Magic slot", resKey: "goo_create_thrall", minLevel: 14,
    inlinePills: ({ ownerLevel }) => [{ icon: "shield", label: "Aberration THP", value: Number(ownerLevel || 1) }],
    desc: "Cast Summon Aberration without a spell slot, material components, or Concentration; it lasts for 1 minute. The aberration gains Temporary HP equal to your Warlock level. When you damage a creature under your Hex, the aberration can use its Reaction to move up to its Speed toward the Hexed target and make one attack." },
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

if (typeof registerSubclassRuntimeConfig === "function") {
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
// [SheetRuntime] END

}

