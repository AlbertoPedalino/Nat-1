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
// Life Domain (XPHB): tutte le feature sono passive, nessuna scelta di build.
// L3: Disciple of Life, Preserve Life (CD)
// L6: Blessed Healer
// L17: Supreme Healing
registerSubclassAdapter("Cleric_Life", function (cls, lv, specs) {
  // nessuna spec
});

registerSubclassSheetFeatureFilter("Cleric_Life", function (ctx, features) {
  const out = Array.isArray(features) ? features.map(f => ({ ...f })) : [];
  const classLevel = Number(ctx?.classLevel || ctx?.character?.classLevel || ctx?.character?.level || 1);
  if (classLevel < 3) return out;

  const desc =
    "When a spell you cast with a spell slot restores Hit Points to a creature, that creature regains additional Hit Points on the turn you cast the spell. The additional Hit Points equal 2 plus the spell slot's level.";

  const norm = (v) => String(v || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const idx = out.findIndex(f => norm(f?.name) === "discipleoflife");
  if (idx >= 0) {
    const cur = out[idx] || {};
    out[idx] = {
      ...cur,
      level: Number(cur.level || 3),
      entries: Array.isArray(cur.entries) && cur.entries.length ? cur.entries : [desc],
    };
    return out;
  }

  out.push({
    name: "Disciple of Life",
    level: 3,
    entries: [desc],
  });
  return out;
});

registerSubclassSheetSpellModifiers("Cleric_Life", [
  function (ctx) {
    if (!ctx || ctx.kind !== "heal") return ctx?.formula;
    if (!ctx.usesSpellSlot) return ctx?.formula;
    if (!ctx.hasHealContext) return ctx?.formula;
    const castLevel = Number(ctx.castLevel || 0);
    if (!Number.isFinite(castLevel) || castLevel < 1) return ctx?.formula;

    const text = String(ctx.formula || "").replace(/\s+/g, "");
    const m = text.match(/^(\d+)d(\d+)([+-]\d+)?$/i);
    if (!m) return ctx?.formula;

    const count = Number(m[1] || 0);
    const faces = Number(m[2] || 0);
    const mod = Number(m[3] || 0) + 2 + castLevel;
    if (!Number.isFinite(count) || !Number.isFinite(faces) || count < 1 || faces < 1) return ctx?.formula;
    return `${count}d${faces}${mod ? (mod > 0 ? "+" : "") + mod : ""}`;
  }
]);

// [SheetRuntime] START
registerSubclassSheetActions("Cleric_Life", [
  { name: "Disciple of Life", icon: "", cat: "action", uses: "Passive", minLevel: 3,
  passive: true,
    desc: "When you cast a spell with a spell slot that restores HP to a creature, that creature regains additional HP equal to 2 + the spell slot's level." },
  { name: "Preserve Life", icon: "", cat: "action", uses: "1 Channel", resKey: "channel_div",
    inlinePills: ({ ownerLevel }) => [
      { icon: "heart", label: "Pool", value: `${Math.max(1, Number(ownerLevel || 1) * 5)} HP` }
    ],
    desc: "As an action, present your Holy Symbol and expend one use of Channel Divinity to restore HP equal to 5 × your Cleric level. Choose any creatures within 30 ft of yourself and divide those HP among them. Cannot restore a creature beyond half its HP maximum. Cannot be used on Undead or Constructs." },
  { name: "Blessed Healer", icon: "", cat: "action", uses: "Passive", minLevel: 6,
  passive: true,
    desc: "When you cast a spell with a spell slot that restores HP to one creature other than you, you regain HP equal to 2 + the spell slot's level." },
  { name: "Supreme Healing", icon: "", cat: "action", uses: "Passive", minLevel: 17,
  passive: true,
    desc: "When you would roll dice to restore HP with a spell or Channel Divinity, don't roll — instead use the highest number possible for each die (e.g., d6 = 6, d8 = 8)." },
]);
if (typeof registerSubclassRuntimeConfig === "function") {
  registerSubclassRuntimeConfig("Cleric_Life", {
    spellcasting: {
      alwaysPreparedSpells: [
        { name: "Aid", minLevel: 3, level: 2 },
        { name: "Bless", minLevel: 3, level: 1 },
        { name: "Cure Wounds", minLevel: 3, level: 1 },
        { name: "Lesser Restoration", minLevel: 3, level: 2 },
        { name: "Mass Healing Word", minLevel: 5, level: 3 },
        { name: "Revivify", minLevel: 5, level: 3 },
        { name: "Aura of Life", minLevel: 7, level: 4 },
        { name: "Death Ward", minLevel: 7, level: 4 },
        { name: "Greater Restoration", minLevel: 9, level: 5 },
        { name: "Mass Cure Wounds", minLevel: 9, level: 5 },
      ],
    },
  });
}

registerSubclassSheetEffects("Cleric_Life", [
  { type: "passiveNote", minLevel: 3, note: "Disciple of Life: healing spell with a slot restores +2 + slot level HP." },
  { type: "passiveNote", minLevel: 6, note: "Blessed Healer: when healing another creature with a spell slot, regain 2 + slot level HP." },
  { type: "healingMaximized", minLevel: 17, note: "Supreme Healing: use maximum values on healing dice." },
]);
// [SheetRuntime] END

}

