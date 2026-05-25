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
registerClassAdapter("Wizard", function (cls, lv, specs) {
  if (lv >= 2) {
    specs.push({
      key: 'wizard_scholar',
      label: 'Scholar (Expertise)',
      type: 'expertise',
      from: ['Arcana', 'Investigation', 'Medicine', 'Religion', 'History', 'Nature'],
      count: 1,
      level: 2,
      requiresProficiency: true
    });
  }
  if (lv >= 18) {
    // Spell Mastery: 1 spell L1 + 1 spell L2 sempre preparate e gratis
    specs.push({
      key: 'wizard_spell_mastery_l1',
      label: 'Spell Mastery — Spell L1',
      type: 'spell_choice',
      spellFilter: { spellLevel: 1, classes: ['Wizard'] },
      count: 1,
      level: 18
    });
    specs.push({
      key: 'wizard_spell_mastery_l2',
      label: 'Spell Mastery — Spell L2',
      type: 'spell_choice',
      spellFilter: { spellLevel: 2, classes: ['Wizard'] },
      count: 1,
      level: 18
    });
  }
  if (lv >= 19) {
    specs.push({ key: 'wizard_epic_boon', label: 'Epic Boon', type: 'feat_cat', categories: ['EB'], count: 1, level: 19 });
  }
  if (lv >= 20) {
    // Signature Spells: 2 spell L3 gratuite 1×/SR
    specs.push({
      key: 'wizard_signature_1',
      label: 'Signature Spell 1',
      type: 'spell_choice',
      spellFilter: { spellLevel: 3, classes: ['Wizard'] },
      count: 1,
      level: 20
    });
    specs.push({
      key: 'wizard_signature_2',
      label: 'Signature Spell 2',
      type: 'spell_choice',
      spellFilter: { spellLevel: 3, classes: ['Wizard'] },
      count: 1,
      level: 20
    });
  }
});

function addWizardSavantSpellChoices(specs, lv, cfg) {
  if (!Array.isArray(specs) || !cfg || !cfg.key || !cfg.school || !cfg.label) return;
  if (lv >= 3) {
    specs.push({
      key: `subclass_${cfg.key}_savant_initial`,
      label: `${cfg.label} Savant - 2 free spells`,
      type: 'spell_choice',
      spellFilter: { spellLevels: [0, 1, 2], classes: ['Wizard'], schools: [cfg.school] },
      count: 2,
      level: 3,
      spellbookGrant: 'wizard'
    });
  }
  [
    { level: 5, spellLevel: 3 },
    { level: 7, spellLevel: 4 },
    { level: 9, spellLevel: 5 },
    { level: 11, spellLevel: 6 },
    { level: 13, spellLevel: 7 },
    { level: 15, spellLevel: 8 },
    { level: 17, spellLevel: 9 },
  ].forEach(function (item) {
    if (lv < item.level) return;
    specs.push({
      key: `subclass_${cfg.key}_savant_lv${item.level}`,
      label: `${cfg.label} Savant - Spell Lv.${item.spellLevel}`,
      type: 'spell_choice',
      spellFilter: { spellLevel: item.spellLevel, classes: ['Wizard'], schools: [cfg.school] },
      count: 1,
      level: item.level,
      spellbookGrant: 'wizard'
    });
  });
}

// [SheetRuntime] START
registerClassSheetActions("Wizard", [
  {
    "name": "Arcane Recovery",
    "icon": "",
    "cat": "action",
    "uses": "1 / LR",
    "resKey": "arc_recovery",
    "desc": "After a Short Rest: recover spell slots with a combined level equal to or less than half your Wizard level (rounded up, max 6th-level slots). Recharge: Long Rest."
  },
  {
    "name": "Spellbook",
    "icon": "",
    "cat": "action",
    "uses": "Passive",
    "passive": true,
    "desc": "Contains your known Wizard spells. Cast Wizard spells with the Ritual tag from your spellbook as rituals without preparing them and without using a slot (+10 min). Copy new spells: costs 50 gp and 2 hours per spell level. Gain 2 free spells at each Wizard level."
  },
  {
    "name": "Memorize Spell",
    "icon": "",
    "cat": "bonus",
    "uses": "1 / SR",
    "minLevel": 5,
    "desc": "After a Short Rest: replace one prepared spell with another Wizard spell from your spellbook. Recharge: Short Rest."
  },
  {
    "name": "Spell Mastery",
    "icon": "",
    "cat": "action",
    "uses": "At will",
    "minLevel": 18,
    "desc": "Choose 1 spell of 1st level and 1 of 2nd level from your spellbook: you can cast each at their lowest level without expending a spell slot, at will."
  },
  {
    "name": "Signature Spells",
    "icon": "",
    "cat": "action",
    "uses": "1 / SR each",
    "minLevel": 20,
    "desc": "Choose two 3rd-level Wizard spells: they are always prepared (don't count toward limit) and you can cast each once per Short Rest without a spell slot."
  }
]);
registerClassSheetResources("Wizard", [
  {
    "key": "arc_recovery",
    "name": "Arcane Recovery",
    "icon": "book-open",
    "recharge": "LR",
    "max": ()=>1
  }
]);
// [SheetRuntime] END

// Arcane Recovery: when used, recover spell slots up to budget (Wizard level/2, rounded up).
if (typeof registerResourceSideEffect === 'function') {
  registerResourceSideEffect('arc_recovery', function (ctx = {}) {
    const C = ctx.character || ctx.C;
    let wizLv = 0;
    if (String(C?.className || '').toLowerCase() === 'wizard') wizLv += C?.classLevel || C?.level || 0;
    (C?.extraClasses || []).forEach(function (ec) {
      if (String(ec?.name || '').toLowerCase() === 'wizard') wizLv += ec.level || 0;
    });
    if (!wizLv) return null;
    const budget = Math.ceil(wizLv / 2);
    return {
      type: 'recover_spell_slots',
      budget,
      maxSlotLevel: 6,
      label: 'Arcane Recovery',
    };
  });
}

}
