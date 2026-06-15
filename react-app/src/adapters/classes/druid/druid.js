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
registerClassAdapter("Druid", function (cls, lv, specs, ctx = {}) {
  const character = ctx.character || {};
  const choices = ctx.choices || character.choices || {};
  const keyPrefix = ctx.keyPrefix || '';
  const choiceValue = function (key) {
    const direct = choices[key];
    if (direct !== undefined) return direct;
    return choices[keyPrefix + key];
  };
  const hasChoice = function (key, value) {
    const raw = choiceValue(key);
    const vals = Array.isArray(raw) ? raw : (raw ? [raw] : []);
    return vals.some(function (v) { return String(v).split('|')[0].trim().toLowerCase() === String(value).toLowerCase(); });
  };

  if (lv >= 1) {
    specs.push({
      key: 'druid_primal_order',
      label: 'Primal Order',
      type: 'generic_choice',
      from: ['Magician', 'Warden'],
      count: 1,
      level: 1
    });
    if (hasChoice('druid_primal_order', 'Magician')) {
      specs.push({
        key: 'druid_magician_cantrip',
        label: 'Magician — Extra Cantrip',
        type: 'spell_choice',
        spellFilter: { spellLevel: 0, classes: ['Druid'] },
        count: 1,
        level: 1
      });
    }
  }
  if (lv >= 7) {
    specs.push({
      key: 'druid_elemental_fury',
      label: 'Elemental Fury',
      type: 'generic_choice',
      from: ['Potent Spellcasting', 'Primal Strike'],
      count: 1,
      level: 7
    });
    if (hasChoice('druid_elemental_fury', 'Primal Strike')) {
      specs.push({
        key: 'druid_primal_strike_damage_type',
        label: 'Primal Strike Damage Type',
        type: 'generic_choice',
        from: ['Cold', 'Fire', 'Lightning', 'Thunder'],
        count: 1,
        level: 7
      });
    }
  }
  if (lv >= 19) {
    specs.push({ key: 'druid_epic_boon', label: 'Epic Boon', type: 'feat_cat', categories: ['EB'], count: 1, level: 19 });
  }
});

// [SheetRuntime] START
registerClassSheetActions("Druid", [
  {
    "name": "Primal Order",
    "icon": "",
    "cat": "action",
    "uses": "Passive",
    "passive": true,
    "desc": "Choose at lv.1 — Magician: learn one extra Druid cantrip; or Warden: proficiency with Martial weapons and training with Medium armor (if not already proficient)."
  },
  {
    "name": "Wild Shape",
    "icon": "",
    "cat": "bonus",
    "uses": "2 / SR+LR",
    "resKey": "wild_shape",
    "minLevel": 2,
    "desc": "Bonus Action. Transform into a Beast you have seen. Max CR: 1/4 (lv.2), 1/2 (lv.4), 1 (lv.8). Gain temporary HP equal to your Druid level. Retain INT/WIS/CHA scores and class features. Gain the beast's HP, attacks, and physical traits. Lasts until reduced to 0 HP, you end it (Bonus Action), or you fall unconscious. Recover 1 use on Short Rest, all on Long Rest."
  },
  {
    "name": "Wild Companion",
    "icon": "",
    "cat": "action",
    "uses": "Spell slot or Wild Shape",
    "minLevel": 2,
    "desc": "Spend one Wild Shape use or a spell slot to cast Find Familiar. The familiar is a Fey creature and vanishes when you finish a Long Rest."
  },
  {
    "name": "Wild Resurgence",
    "icon": "",
    "cat": "bonus",
    "uses": "Situational",
    "resKey": "wild_resurgence",
    "minLevel": 5,
    "desc": "If you have no Wild Shape uses left, you can spend a spell slot of lv.1 or higher to regain one. Alternatively, you can expend one Wild Shape use to regain a lv.1 spell slot (once per LR)."
  },
  {
    "name": "Elemental Fury",
    "icon": "",
    "cat": "action",
    "uses": "Passive",
    "passive": true,
    "minLevel": 7,
    rollers: [{ kind: 'damage', formula: "1d8", label: "+1d8" }],
    "desc": "Choose at lv.7 — Potent Spellcasting: add WIS modifier to Druid cantrip damage rolls; or Primal Strike: once per turn when you hit with a weapon or Beast attack, deal +1d8 Cold, Fire, Lightning, or Thunder damage (chosen when feature is gained)."
  },
  {
    "name": "Improved Elemental Fury",
    "icon": "",
    "cat": "action",
    "uses": "Passive",
    "passive": true,
    "minLevel": 15,
    "desc": "Your Elemental Fury improves — Potent Spellcasting: your Druid cantrip range increases by 300 ft; Primal Strike: the extra damage increases to 2d8."
  },
  {
    "name": "Beast Spells",
    "icon": "",
    "cat": "action",
    "uses": "Passive",
    "passive": true,
    "minLevel": 18,
    "desc": "While in Wild Shape, you can cast any Druid spell you have prepared, as long as it has no Material components or its Material components have no cost."
  },
  {
    "name": "Archdruid",
    "icon": "",
    "cat": "action",
    "uses": "Passive",
    "passive": true,
    "minLevel": 20,
    "desc": "Three benefits: (1) Evergreen Wild Shape — when you roll Initiative, you regain one expended Wild Shape use; (2) Nature Magician — spend 2 Wild Shape uses to regain one expended spell slot of 5th level or lower (1/LR); (3) Longevity — you age at 1/10 the normal rate and can't be aged magically."
  }
]);
registerClassSheetResources("Druid", [
  {
    "key": "wild_shape",
    "name": "Wild Shape",
    "icon": "paw-print",
    "recharge": "LR",
    "srRecover": 1,
    "max": (lv)=>lv>=17?4:lv>=6?3:2
  },
  {
    "key": "wild_resurgence",
    "name": "Wild Resurgence",
    "icon": "refresh-cw",
    "recharge": "LR",
    "max": () => Infinity,
    "pool": true
  }
]);
registerClassSheetProficiencies("Druid", [
  { type: "language", values: ["Druidic"], minLevel: 1 },
  { type: "armor",  values: ["Medium"],  minLevel: 1, requiredChoice: { key: "druid_primal_order", value: "Warden" } },
  { type: "weapon", values: ["Martial"], minLevel: 1, requiredChoice: { key: "druid_primal_order", value: "Warden" } }
]);

// Druidic feature (lv.1) always keeps Speak with Animals prepared.
if (typeof registerClassRuntimeConfig === "function") {
  registerClassRuntimeConfig("Druid", {
    spellcasting: {
      alwaysPreparedSpells: [
        { name: "Speak with Animals", minLevel: 1, level: 1 }
      ],
    },
  });
}

if (typeof registerResourceSideEffect === 'function') {
  registerResourceSideEffect('wild_resurgence', function (ctx = {}) {
    const C = ctx.character || ctx.C;
    const res = ctx.resources || {};
    const currentWS = Number(res.wild_shape || 0);
    const slots = ctx.slots || { regular: [] };
    const used = ctx.sheet?.spellSlotUsed || {};
    const created = ctx.sheet?.createdSpellSlots || {};
    const hasWildShape = currentWS > 0;
    let hasAvailableSlot = false;
    for (let lv = 1; lv <= slots.regular.length; lv++) {
      const total = Number(slots.regular[lv - 1] || 0);
      if (!total) continue;
      const avail = total - Number(used[lv] || used[String(lv)] || 0) + Number(created[lv] || 0);
      if (avail > 0) { hasAvailableSlot = true; break; }
    }
    return {
      type: 'wild_resurgence',
      hasWildShape,
      hasAvailableSlot,
      currentWS,
      label: 'Wild Resurgence',
    };
  });
}
// [SheetRuntime] END

}

