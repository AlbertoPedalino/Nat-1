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
const _BM_MANEUVERS = [
  'Ambush', 'Bait and Switch', "Commander's Strike", 'Commanding Presence',
  'Disarming Attack', 'Distracting Strike', 'Evasive Footwork', 'Feinting Attack',
  'Goading Attack', 'Lunging Attack', 'Maneuvering Attack', 'Menacing Attack',
  'Parry', 'Precision Attack', 'Pushing Attack', 'Rally',
  'Riposte', 'Sweeping Attack', 'Tactical Assessment', 'Trip Attack',
];

const _BM_STUDENT_SKILLS = [
  'Acrobatics', 'Animal Handling', 'Athletics', 'History',
  'Insight', 'Intimidation', 'Perception', 'Survival',
];

// +3 a L3, +2 a L7, +2 a L10, +2 a L15 (totale max 9)
const _BM_SLOTS = [
  { idx: 1, level: 3 }, { idx: 2, level: 3 }, { idx: 3, level: 3 },
  { idx: 4, level: 7 }, { idx: 5, level: 7 },
  { idx: 6, level: 10 }, { idx: 7, level: 10 },
  { idx: 8, level: 15 }, { idx: 9, level: 15 },
];

registerSubclassAdapter("Fighter_Battle Master", function (cls, lv, specs) {
  if (lv >= 3) {
    specs.push({
      key: 'subclass_bm_student_tool',
      label: "Student of War — Artisan's Tool",
      type: 'generic_choice',
      from: _ARTISAN_TOOLS || [],
      count: 1,
      level: 3
    });
    specs.push({
      key: 'subclass_bm_student_skill',
      label: "Student of War — Skill Proficiency",
      type: 'skill_choice',
      from: _BM_STUDENT_SKILLS,
      count: 1,
      level: 3
    });
  }
  _BM_SLOTS.forEach(function (slot) {
    if (lv >= slot.level) {
      specs.push({
        key: 'subclass_bm_maneuver_' + slot.idx,
        label: 'Battle Maneuver ' + slot.idx,
        type: 'generic_choice',
        from: _BM_MANEUVERS,
        count: 1,
        level: slot.level
      });
    }
  });
});

// [SheetRuntime] START
registerSubclassSheetActions("Fighter_Battle Master", [
  { name: "Combat Maneuvers", icon: "", cat: "attack", uses: "Superiority Dice", resKey: "superiority_dice", minLevel: 3,
    desc: "Spend Superiority Dice to enhance attacks (d8 at lv.3, d10 at lv.10, d12 at lv.18). Only one maneuver per attack. Save DC = 8 + STR or DEX (your choice) + PB. Recharge: Short or Long Rest." },
  { name: "Know Your Enemy", icon: "", cat: "bonus", uses: "1 / LR or Superiority Die", resKey: "know_your_enemy", minLevel: 7,
    desc: "Bonus Action: choose a creature within 30 ft you can see. Learn whether it has any Immunities, Resistances, or Vulnerabilities, and if so what they are. 1/LR, or expend one Superiority Die (no action) to restore." },
  { name: "Relentless", icon: "", cat: "action", uses: "1 / turn", minLevel: 15,
    desc: "Once per turn, when you use a maneuver, you can roll a d8 and use the number rolled instead of expending a Superiority Die." },
  { name: "Ultimate Combat Superiority", icon: "", cat: "action", uses: "Passive", minLevel: 18,
  passive: true,
    desc: "Your Superiority Die becomes a d12." },
]);
registerSubclassSheetResources("Fighter_Battle Master", [
  { key: "superiority_dice", name: "Superiority Dice", actionName: "Combat Maneuvers", icon: "swords", recharge: "SR",
    max: (lv) => lv >= 15 ? 6 : lv >= 7 ? 5 : 4,
    die: (lv) => lv >= 18 ? "d12" : lv >= 10 ? "d10" : "d8",
    pool: true },
  { key: "know_your_enemy", name: "Know Your Enemy", icon: "eye", recharge: "LR", max: () => 1 },
]);

registerSubclassSheetEffects("Fighter_Battle Master", [

  { type: "toolProficiency", count: 1, minLevel: 3, note: "Student of War: artisan's tool choice." },
  { type: "skillProficiency", values: ["History", "Insight", "Performance", "Persuasion"], count: 1, minLevel: 3, note: "Student of War." },
  { type: "saveDc", key: "maneuver_dc", minLevel: 3, note: "Maneuver Save DC = 8 + STR or DEX mod + PB." },
]);
// [SheetRuntime] END

}

