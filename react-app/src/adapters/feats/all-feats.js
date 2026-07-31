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


  if (typeof registerGlobalFeatAdapter !== "function") return;

  function _toTitleClass(raw) {
    const map = {
      artificer: "Artificer",
      barbarian: "Barbarian",
      bard: "Bard",
      cleric: "Cleric",
      druid: "Druid",
      fighter: "Fighter",
      monk: "Monk",
      paladin: "Paladin",
      ranger: "Ranger",
      rogue: "Rogue",
      sorcerer: "Sorcerer",
      warlock: "Warlock",
      wizard: "Wizard"
    };
    const key = String(raw || "").toLowerCase().replace(/[^a-z]/g, "");
    return map[key] || "";
  }

  function _classFromChooseString(str) {
    const text = String(str || "");
    const classPart = text
      .split("|")
      .find(function (p) { return /^class=/i.test(String(p || "")); });
    if (!classPart) return "";
    const first = classPart
      .replace(/^class=/i, "")
      .split(/[;,]/)
      .map(_toTitleClass)
      .find(Boolean);
    return first || "";
  }

  function _walkFindClass(node) {
    if (!node) return "";
    if (Array.isArray(node)) {
      for (const item of node) {
        const hit = _walkFindClass(item);
        if (hit) return hit;
      }
      return "";
    }
    if (typeof node === "string") return "";
    if (typeof node !== "object") return "";
    if (typeof node.choose === "string") {
      const hit = _classFromChooseString(node.choose);
      if (hit) return hit;
    }
    for (const value of Object.values(node)) {
      const hit = _walkFindClass(value);
      if (hit) return hit;
    }
    return "";
  }

  function _normalizeAdditionalSpellEntry(entry) {
    const out = entry && typeof entry === "object" ? { ...entry } : entry;
    if (!out || typeof out !== "object") return out;
    if (!out.name) {
      const cls = _walkFindClass(out);
      if (cls) out.name = cls + " Spells";
    }
    return out;
  }

  function _normalizeVersions(rawVersions) {
    const versions = Array.isArray(rawVersions) ? rawVersions : [];
    return versions.map(function (v) {
      const out = v && typeof v === "object" ? { ...v } : v;
      if (!out || typeof out !== "object") return out;
      if (Array.isArray(out.additionalSpells)) {
        out.additionalSpells = out.additionalSpells.map(_normalizeAdditionalSpellEntry);
      }
      return out;
    });
  }

  registerGlobalFeatAdapter(function (feat) {
    const out = feat && typeof feat === "object" ? { ...feat } : feat;
    if (!out || typeof out !== "object") return out;

    if (Array.isArray(out.additionalSpells)) {
      out.additionalSpells = out.additionalSpells.map(_normalizeAdditionalSpellEntry);
    }

    const versions = _normalizeVersions(out._versions);
    if (versions.length) {
      out._versions = versions;
      const map = {};
      versions.forEach(function (v, idx) {
        const key = String(v?.name || "").trim();
        if (key) map[key] = idx;
      });
      out._meta = {
        ...(out._meta && typeof out._meta === "object" ? out._meta : {}),
        versionIndexByName: map
      };
    }

    // Auto-detect ability score choice: feat.ability[].choose → choiceUi.abilityScoreIncrease
    if (Array.isArray(out.ability) && !(out.choiceUi && out.choiceUi.abilityScoreIncrease)) {
      for (const ab of out.ability) {
        if (ab && typeof ab === "object" && ab.choose && typeof ab.choose === "object") {
          const from = Array.isArray(ab.choose.from) ? ab.choose.from : [];
          const count = typeof ab.choose.count === "number" ? ab.choose.count : 1;
          const modes = count >= 2 ? ["double", "split"] : ["single"];
          const asiConf = { modes };
          if (from.length) asiConf.from = from;
          out.choiceUi = {
            ...(out.choiceUi && typeof out.choiceUi === "object" ? out.choiceUi : {}),
            abilityScoreIncrease: asiConf
          };
          break;
        }
      }
    }

    return out;
  });

}

