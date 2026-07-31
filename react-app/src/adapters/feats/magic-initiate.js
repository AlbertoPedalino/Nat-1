import { createAdapterBindings } from '../adapterBindings.js';

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


  if (typeof registerFeatAdapter !== "function") return;

  function _titleClass(raw) {
    const map = {
      artificer: "Artificer",
      bard: "Bard",
      cleric: "Cleric",
      druid: "Druid",
      sorcerer: "Sorcerer",
      warlock: "Warlock",
      wizard: "Wizard"
    };
    const k = String(raw || "").toLowerCase().replace(/[^a-z]/g, "");
    return map[k] || "";
  }

  function _parseChooseClass(str) {
    const text = String(str || "");
    const part = text
      .split("|")
      .find(function (p) { return /^class=/i.test(String(p || "")); });
    if (!part) return "";
    const first = part
      .replace(/^class=/i, "")
      .split(/[;,]/)
      .map(function (p) { return _titleClass(p); })
      .find(Boolean);
    return first || "";
  }

  function _walkForClass(node) {
    if (!node) return "";
    if (Array.isArray(node)) {
      for (const item of node) {
        const hit = _walkForClass(item);
        if (hit) return hit;
      }
      return "";
    }
    if (typeof node === "string") return "";
    if (typeof node !== "object") return "";
    if (node.choose) {
      const hit = _parseChooseClass(node.choose);
      if (hit) return hit;
    }
    for (const value of Object.values(node)) {
      const hit = _walkForClass(value);
      if (hit) return hit;
    }
    return "";
  }

  function _adaptMagicInitiate(feat) {
    const out = feat && typeof feat === "object" ? { ...feat } : {};
    const grants = Array.isArray(out.additionalSpells) ? out.additionalSpells : [];
    out.additionalSpells = grants.map(function (grant) {
      const g = grant && typeof grant === "object" ? { ...grant } : grant;
      if (!g || typeof g !== "object") return g;
      if (!g.name) {
        const className = _walkForClass(g);
        if (className) g.name = className;
      }
      return g;
    });

    const cats = Array.isArray(out.categories) ? out.categories.slice() : [];
    if (!cats.includes("O")) cats.unshift("O");
    out.categories = cats;
    out.category = out.category || "O";

    out.choiceUi = {
      ...(out.choiceUi && typeof out.choiceUi === "object" ? out.choiceUi : {}),
      listLabel: "Scegli lista",
      spellAbility: {
        keySuffix: "spell_ability",
        label: "Spellcasting Ability",
        options: [
          { value: "int", label: "Intelligence" },
          { value: "wis", label: "Wisdom" },
          { value: "cha", label: "Charisma" }
        ]
      }
    };

    return out;
  }

  registerFeatAdapter("Magic Initiate", _adaptMagicInitiate);

}

