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

const _ARTIFICER_PLAN_POOL_LV2 = [
  'Alchemy Jug',
  'Bag of Holding',
  'Cap of Water Breathing',
  'Common magic item (non-Potion, non-Scroll, non-cursed)',
  'Goggles of Night',
  'Manifold Tool',
  'Repeating Shot',
  'Returning Weapon',
  'Rope of Climbing',
  'Sending Stones',
  'Shield +1',
  'Wand of Magic Detection',
  'Wand of Secrets',
  'Wand of the War Mage +1',
  'Weapon +1',
  'Wraps of Unarmed Power +1',
];

const _ARTIFICER_PLAN_POOL_LV6 = [
  'Armor +1',
  'Boots of Elvenkind',
  'Boots of the Winding Path',
  'Cloak of Elvenkind',
  'Cloak of the Manta Ray',
  'Dazzling Weapon',
  'Eyes of Charming',
  'Eyes of Minute Seeing',
  'Gloves of Thievery',
  'Helm of Awareness',
  'Lantern of Revealing',
  'Mind Sharpener',
  'Necklace of Adaptation',
  'Pipes of Haunting',
  'Repulsion Shield',
  'Ring of Swimming',
  'Ring of Water Walking',
  'Sentinel Shield',
  'Spell-Refueling Ring',
  'Wand of Magic Missiles',
  'Wand of Web',
  'Weapon of Warning',
];

const _ARTIFICER_PLAN_POOL_LV10 = [
  'Armor of Resistance',
  'Dagger of Venom',
  'Elven Chain',
  'Ring of Feather Falling',
  'Ring of Jumping',
  'Ring of Mind Shielding',
  'Shield +2',
  'Uncommon Wondrous Item (non-cursed)',
  'Wand of the War Mage +2',
  'Weapon +2',
  'Wraps of Unarmed Power +2',
];

const _ARTIFICER_PLAN_POOL_LV14 = [
  'Armor +2',
  'Arrow-Catching Shield',
  'Flame Tongue',
  'Rare Wondrous Item (non-cursed)',
  'Ring of Free Action',
  'Ring of Protection',
  'Ring of the Ram',
];

function _artificerPlansKnownAtLevel(level) {
  if (level < 2) return 0;
  if (level >= 18) return 8;
  if (level >= 14) return 7;
  if (level >= 10) return 6;
  if (level >= 6) return 5;
  return 4;
}

function _artificerPlanPoolForLevel(level) {
  let pool = _ARTIFICER_PLAN_POOL_LV2.slice();
  if (level >= 6) pool = pool.concat(_ARTIFICER_PLAN_POOL_LV6);
  if (level >= 10) pool = pool.concat(_ARTIFICER_PLAN_POOL_LV10);
  if (level >= 14) pool = pool.concat(_ARTIFICER_PLAN_POOL_LV14);
  return [...new Set(pool)];
}

registerClassAdapter("Artificer", function (cls, lv, specs) {
  if (lv >= 2) {
    specs.push({
      key: 'artificer_replicate_magic_item_plans',
      label: 'Replicate Magic Item (Plans Known)',
      type: 'generic_choice',
      from: _artificerPlanPoolForLevel(lv),
      count: _artificerPlansKnownAtLevel(lv),
      level: 2
    });
  }

  [4, 8, 12, 16].forEach(function (featLv) {
    if (lv >= featLv) {
      specs.push({
        key: 'artificer_feat_lv' + featLv,
        label: 'Feat (Artificer Lv.' + featLv + ')',
        type: 'feat_cat',
        categories: ['G'],
        count: 1,
        level: featLv
      });
    }
  });

  if (lv >= 19) {
    specs.push({
      key: 'artificer_epic_boon',
      label: 'Epic Boon / General Feat',
      type: 'feat_cat',
      categories: ['EB', 'G'],
      count: 1,
      level: 19
    });
  }
});

// [SheetRuntime] START
registerClassSheetActions("Artificer", [
  {
    "name": "Magical Tinkering",
    "icon": "",
    "cat": "action",
    "uses": "Passive",
    "passive": true,
    "minLevel": 1,
    "desc": "Passive: using Tinker's Tools, you can imbue a Tiny nonmagical object with one minor magical property (light, recorded message, odor/vision, or faint magical aura). Up to a number of objects equal to your INT modifier can be active at once."
  },
  {
    "name": "Replicate Magic Item",
    "icon": "",
    "cat": "action",
    "uses": "After Long Rest",
    "minLevel": 2,
    "desc": "After a Long Rest, create magic items from the plans you know. Plans known and active items increase with Artificer level."
  },
  {
    "name": "Flash of Genius",
    "icon": "",
    "cat": "reaction",
    "uses": "INT mod / LR",
    "resKey": "flash_genius",
    "minLevel": 7,
    "desc": "When you or a creature you can see within 30 ft fails an ability check or saving throw, add your Intelligence modifier to the roll."
  },
  {
    "name": "Spell-Storing Item",
    "icon": "",
    "cat": "action",
    "uses": "1 active item",
    "minLevel": 11,
    "desc": "After a Long Rest, store one Artificer spell (level 1-3) in a weapon or spellcasting focus item so it can be cast repeatedly from that item."
  },
  {
    "name": "Soul of Artifice",
    "icon": "",
    "cat": "reaction",
    "uses": "Passive + Reaction",
    "passive": true,
    "minLevel": 20,
    "desc": "Passive: you gain +1 bonus to all saving throws per magic item you are currently attuned to (max +6). Reaction: when you are reduced to 0 HP, you can end one of your attunements — you drop to 1 HP instead."
  }
]);
registerClassSheetResources("Artificer", [
  {
    "key": "flash_genius",
    "name": "Flash of Genius",
    "icon": "brain",
    "recharge": "LR",
    "max": (lv, { int } = {}) => Math.max(1, int ?? 0)
  }
]);
registerClassSheetChoiceMeta("Artificer", {
  sectionTitle: "Artificer Choices",
  labels: {
    artificer_replicate_magic_item_plans: "Replicate Magic Item Plans",
    armorer_model: "Armor Model",
    alchemist_bonus_tool: "Tools of the Trade (Alchemist)",
    armorer_bonus_tool: "Tools of the Trade (Armorer)",
    artillerist_bonus_tool: "Tools of the Trade (Artillerist)",
    battlesmith_bonus_tool: "Tools of the Trade (Battle Smith)",
    cartographer_bonus_tool: "Tools of the Trade (Cartographer)",
  },
  isChoiceKey: (key) => {
    const k = String(key || "");
    if (/^artificer_feat_lv\d+$/i.test(k)) return false;
    if (/^(artificer_|alchemist_|armorer_|artillerist_|battlesmith_|cartographer_)/i.test(k)) return true;
    if (/^auto_(primary|ec\d+)_feat_/i.test(k)) return true;
    return false;
  },
  getLabel: (key) => {
    const k = String(key || "");
    if (/^auto_(primary|ec\d+)_feat_/i.test(k)) {
      let s = k.replace(/^auto_(primary|ec\d+)_feat_/i, "");
      s = s.replace(/_skill_\d+$/i, " Skill Proficiency");
      s = s.replace(/_lang_\d+$/i, " Language");
      s = s.replace(/_tool_\d+$/i, " Tool Proficiency");
      s = s.replace(/_stl_\d+_\d+$/i, " Proficiency Choice");
      s = s.replace(/_weaponProficiencies_\d+$/i, " Weapon Proficiency");
      s = s.replace(/_armorProficiencies_\d+$/i, " Armor Proficiency");
      s = s.replace(/_opt_\d+$/i, " Option");
      return s.replace(/_/g, " ").replace(/\b[a-z]/g, c => c.toUpperCase()).trim();
    }
    return k.replace(/^.*?_/, "").replace(/_/g, " ").replace(/\b[a-z]/g, c => c.toUpperCase()).trim();
  },
  normalizeChoiceValue: (value, key) => {
    const k = String(key || "");
    const raw = String(value || "").split("|")[0].replace(/\{@\w+ /g, "").replace(/\}/g, "").trim();
    if (!raw) return "";
    if (k === "armorer_model" || /^auto_(primary|ec\d+)_feat_.*_opt_\d+$/i.test(k)) {
      const nk = raw.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (nk === "dreadnaught" || nk.includes("dreadnought")) return "Dreadnought";
      if (nk.includes("guardian")) return "Guardian";
      if (nk.includes("infiltrator")) return "Infiltrator";
    }
    return raw;
  },
});
// [SheetRuntime] END

// ── Choice key filter: which char.choices keys belong to Artificer ──
registerClassChoiceKeyFilter("Artificer", function (baseKey) {
  if (/^(artificer_|alchemist_|armorer_|artillerist_|battlesmith_|cartographer_)/i.test(baseKey)) return true;
  if (/^auto_(primary|ec\d+)_feat_/i.test(baseKey)) return true;
  return false;
});

// ── Choice label provider: human-readable label for each Artificer choice key ──
const _ARTIFICER_CHOICE_LABELS = {
  artificer_replicate_magic_item_plans: 'Replicate Magic Item Plans',
  armorer_model: 'Armor Model',
  alchemist_bonus_tool: 'Tools of the Trade (Alchemist)',
  armorer_bonus_tool: 'Tools of the Trade (Armorer)',
  artillerist_bonus_tool: 'Tools of the Trade (Artillerist)',
  battlesmith_bonus_tool: 'Tools of the Trade (Battle Smith)',
  cartographer_bonus_tool: 'Tools of the Trade (Cartographer)',
};
registerClassChoiceLabelProvider("Artificer", function (baseKey) {
  if (_ARTIFICER_CHOICE_LABELS[baseKey]) return _ARTIFICER_CHOICE_LABELS[baseKey];
  const _tc = (s) => String(s || '').replace(/_/g, ' ').replace(/\b[a-z]/g, c => c.toUpperCase()).trim();
  if (/^auto_(primary|ec\d+)_feat_/i.test(baseKey)) {
    let s = baseKey.replace(/^auto_(primary|ec\d+)_feat_/i, '');
    s = s.replace(/_skill_\d+$/i, ' Skill Proficiency');
    s = s.replace(/_lang_\d+$/i, ' Language');
    s = s.replace(/_tool_\d+$/i, ' Tool Proficiency');
    s = s.replace(/_stl_\d+_\d+$/i, ' Proficiency Choice');
    s = s.replace(/_weaponProficiencies_\d+$/i, ' Weapon Proficiency');
    s = s.replace(/_armorProficiencies_\d+$/i, ' Armor Proficiency');
    s = s.replace(/_opt_\d+$/i, ' Option');
    return _tc(s);
  }
  return _tc(baseKey.replace(/^.*?_/, ''));
});

}

