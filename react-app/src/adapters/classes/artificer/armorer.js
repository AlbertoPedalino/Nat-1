import { createAdapterBindings } from '../../adapterBindings.js';
import { getArtificerConditionalBonusToolCount } from './artificerTools.js';

export default function install(registry, context = {}) {
  const getPB = context?.getPB;
  const getMod = context?.getMod;
  const getFinal = context?.getFinal;
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
registerSubclassAdapter("Artificer_Armorer", function (cls, lv, specs, ctx = {}) {
  if (lv < 3) return;

  specs.push({
    key: 'armorer_model',
    label: 'Armorer - Armor Model (Arcane Armor)',
    type: 'generic_choice',
    from: ['Dreadnaught', 'Guardian', 'Infiltrator'],
    count: 1,
    level: 3
  });

  const bonusCount = getArtificerConditionalBonusToolCount(ctx, ["Smith's Tools"], cls);
  if (!bonusCount) return;
  specs.push({
    key: 'armorer_bonus_tool',
    label: 'Armorer - Bonus Artisan Tool',
    type: 'generic_choice',
    from: _ARTISAN_TOOLS,
    count: bonusCount,
    level: 3
  });
});

// [SheetRuntime] START
registerSubclassSheetActions("Artificer_Armorer", [
  {
    "name": "Arcane Armor",
    "icon": "",
    "cat": "action",
    "uses": "At will",
    "minLevel": 3,
    "choiceKey": "armorer_model",
    "choiceLabel": "Arcane Armor Model",
    "desc": "Magic action (Smith's Tools in hand): turn worn armor into Arcane Armor. Benefits: no Strength requirement, don/doff as Utilize action (can't be removed against will), use as spellcasting focus. Change armor model on Short or Long Rest (Smith's Tools required)."
  },
  {
    "name": "Thunder Pulse",
    "icon": "",
    "cat": "attack",
    "uses": "At will",
    "minLevel": 3,
    "requiresChoice": { "key": "armorer_model", "value": "Guardian" },
    "requiresInventoryFlag": { "flag": "arcaneArmor", "itemType": ["LA", "MA", "HA"], "equipped": true },
    "attackBonus": ({ character }) => {
      if (typeof getPB !== 'function' || typeof getMod !== 'function' || typeof getFinal !== 'function') return 0;
      try { return getPB(character) + getMod(getFinal(character, 'int')); } catch { return 0; }
    },
    rollers: [{ kind: 'damage', formula: ({ character }) => {
      if (typeof getMod !== 'function' || typeof getFinal !== 'function') return '1d8';
      try {
        const intMod = getMod(getFinal(character, 'int'));
        return intMod > 0 ? `1d8+${intMod}` : intMod < 0 ? `1d8${intMod}` : '1d8';
      } catch { return '1d8'; }
    }, label: ({ formula }) => `${formula} thunder` }],
    "desc": "Guardian model Simple Melee weapon (INT to attack/damage). On a hit, the target has Disadvantage on attack rolls against targets other than you until the start of your next turn."
  },
  {
    "name": "Defensive Field",
    "icon": "",
    "cat": "bonus",
    "uses": "At will (while Bloodied)",
    "minLevel": 3,
    "requiresChoice": { "key": "armorer_model", "value": "Guardian" },
    "requiresInventoryFlag": { "flag": "arcaneArmor", "itemType": ["LA", "MA", "HA"], "equipped": true },
    "desc": "Guardian model. While Bloodied (at or below half HP), take a Bonus Action to gain Temporary HP equal to your Artificer level. Lost if you doff the armor."
  },
  {
    "name": "Lightning Launcher",
    "icon": "",
    "cat": "attack",
    "uses": "At will",
    "minLevel": 3,
    "requiresChoice": { "key": "armorer_model", "value": "Infiltrator" },
    "requiresInventoryFlag": { "flag": "arcaneArmor", "itemType": ["LA", "MA", "HA"], "equipped": true },
    "attackBonus": ({ character }) => {
      if (typeof getPB !== 'function' || typeof getMod !== 'function' || typeof getFinal !== 'function') return 0;
      try { return getPB(character) + getMod(getFinal(character, 'int')); } catch { return 0; }
    },
    rollers: [{ kind: 'damage', formula: ({ character }) => {
      if (typeof getMod !== 'function' || typeof getFinal !== 'function') return '1d6';
      try {
        const intMod = getMod(getFinal(character, 'int'));
        return intMod > 0 ? `1d6+${intMod}` : intMod < 0 ? `1d6${intMod}` : '1d6';
      } catch { return '1d6'; }
    }, label: ({ formula }) => `${formula} lightning` }],
    "desc": "Infiltrator model Simple Ranged weapon (range 90/300, INT to attack/damage). Once per turn, one creature you hit also takes an extra 1d6 Lightning damage."
  },
  {
    "name": "Powered Steps",
    "icon": "",
    "cat": "action",
    "uses": "Passive",
    "passive": true,
    "minLevel": 3,
    "requiresChoice": { "key": "armorer_model", "value": "Infiltrator" },
    "requiresInventoryFlag": { "flag": "arcaneArmor", "itemType": ["LA", "MA", "HA"], "equipped": true },
    "desc": "Infiltrator model passive: your Speed increases by 5 ft."
  },
  {
    "name": "Dampening Field",
    "icon": "",
    "cat": "action",
    "uses": "Passive",
    "passive": true,
    "minLevel": 3,
    "requiresChoice": { "key": "armorer_model", "value": "Infiltrator" },
    "requiresInventoryFlag": { "flag": "arcaneArmor", "itemType": ["LA", "MA", "HA"], "equipped": true },
    "desc": "Infiltrator model passive: Advantage on DEX (Stealth) checks. If the armor imposes Disadvantage on such checks, they cancel each other."
  },
  {
    "name": "Force Demolisher",
    "icon": "",
    "cat": "attack",
    "uses": "At will",
    "minLevel": 3,
    "requiresChoice": { "key": "armorer_model", "value": "Dreadnaught" },
    "requiresInventoryFlag": { "flag": "arcaneArmor", "itemType": ["LA", "MA", "HA"], "equipped": true },
    "attackBonus": ({ character }) => {
      if (typeof getPB !== 'function' || typeof getMod !== 'function' || typeof getFinal !== 'function') return 0;
      try { return getPB(character) + getMod(getFinal(character, 'int')); } catch { return 0; }
    },
    rollers: [{ kind: 'damage', formula: ({ character }) => {
      if (typeof getMod !== 'function' || typeof getFinal !== 'function') return '1d10';
      try {
        const intMod = getMod(getFinal(character, 'int'));
        return intMod > 0 ? `1d10+${intMod}` : intMod < 0 ? `1d10${intMod}` : '1d10';
      } catch { return '1d10'; }
    }, label: ({ formula }) => `${formula} force` }],
    "desc": "Dreadnaught model Simple Melee weapon with Reach (INT to attack/damage). On a hit, if the target is at least one size smaller than you: push it up to 10 ft away or pull it up to 10 ft toward you."
  },
  {
    "name": "Giant Stature",
    "icon": "",
    "cat": "bonus",
    "uses": "INT mod / LR",
    "resKey": "armorer_giant_stature",
    "minLevel": 3,
    "requiresChoice": { "key": "armorer_model", "value": "Dreadnaught" },
    "requiresInventoryFlag": { "flag": "arcaneArmor", "itemType": ["LA", "MA", "HA"], "equipped": true },
    "desc": "Dreadnaught model. Bonus Action: enlarge armor for 1 minute — reach +5 ft, and if smaller than Large you become Large (if space permits). Uses: INT modifier (min 1) per Long Rest."
  },
  {
    "name": "Extra Attack",
    "icon": "",
    "cat": "attack",
    "uses": "Passive",
    "passive": true,
    "minLevel": 5,
    "desc": "Passive: you can attack twice whenever you take the Attack action on your turn."
  },
  {
    "name": "Improved Armorer",
    "icon": "",
    "cat": "action",
    "uses": "Passive",
    "passive": true,
    "minLevel": 9,
    "desc": "Armor Replication: learn one additional Replicate Magic Item plan (must be Armor category); can also create one additional item from it. Improved Arsenal: gain +1 bonus to attack and damage rolls made with the special weapon of your Arcane Armor model."
  },
  {
    "name": "Perfected Armor (Guardian)",
    "icon": "",
    "cat": "reaction",
    "uses": "INT mod / LR",
    "resKey": "perfected_guardian",
    "minLevel": 15,
    "requiresChoice": { "key": "armorer_model", "value": "Guardian" },
    "desc": "Thunder Pulse damage increases to 1d10. Reaction when a Huge or smaller creature ends its turn within 30 ft: force STR save (spell save DC). On fail, pull creature up to 25 ft toward you; if within 5 ft, make a melee weapon attack as part of the Reaction. Uses: INT modifier (min 1) per Long Rest."
  },
  {
    "name": "Perfected Armor (Infiltrator)",
    "icon": "",
    "cat": "bonus",
    "uses": "INT mod / LR",
    "resKey": "perfected_infiltrator",
    "minLevel": 15,
    "requiresChoice": { "key": "armorer_model", "value": "Infiltrator" },
    "desc": "Lightning Launcher damage increases to 2d6. Creatures that take Lightning damage from it glimmer until your next turn: shed Dim Light 5 ft, have Disadvantage on attacks against you. Bonus Action: gain Fly Speed = 2× your Speed until end of turn. Uses: INT modifier (min 1) per Long Rest."
  },
  {
    "name": "Perfected Armor (Dreadnaught)",
    "icon": "",
    "cat": "bonus",
    "uses": "INT mod / LR",
    "resKey": "armorer_giant_stature",
    "minLevel": 15,
    "requiresChoice": { "key": "armorer_model", "value": "Dreadnaught" },
    "desc": "Force Demolisher damage increases to 2d6. During Giant Stature: reach +10 ft (instead of +5), size can increase to Large or Huge (your choice), and you have Advantage on STR checks and STR saving throws for the duration."
  }
]);
registerSubclassSheetResources("Artificer_Armorer", [
  {
    "key": "armorer_giant_stature",
    "name": "Giant Stature",
    "icon": "maximize",
    "recharge": "LR",
    "max": (lv, { int } = {}) => Math.max(1, int ?? 0),
    "requiresChoice": { "key": "armorer_model", "value": "Dreadnaught" },
    "requiresInventoryFlag": { "flag": "arcaneArmor", "itemType": ["LA", "MA", "HA"], "equipped": true }
  },
  {
    "key": "perfected_guardian",
    "name": "Perfected Guardian Pull",
    "icon": "magnet",
    "recharge": "LR",
    "max": (lv, { int } = {}) => Math.max(1, int ?? 0),
    "requiresChoice": { "key": "armorer_model", "value": "Guardian" },
    "requiresInventoryFlag": { "flag": "arcaneArmor", "itemType": ["LA", "MA", "HA"], "equipped": true }
  },
  {
    "key": "perfected_infiltrator",
    "name": "Infiltrator Fly",
    "icon": "feather",
    "recharge": "LR",
    "max": (lv, { int } = {}) => Math.max(1, int ?? 0),
    "requiresChoice": { "key": "armorer_model", "value": "Infiltrator" },
    "requiresInventoryFlag": { "flag": "arcaneArmor", "itemType": ["LA", "MA", "HA"], "equipped": true }
  }
]);
registerSubclassSheetProficiencies("Artificer_Armorer", [
  { type: "tool", values: ["Smith's Tools"], minLevel: 3 },
  { type: "armor", values: ["Heavy"], minLevel: 3 }
]);
if (typeof registerItemFlagDef === 'function') {
  registerItemFlagDef("arcaneArmor", {
    label: "Arcane Armor",
    icon: "shield",
    types: ['LA','MA','HA'],
    maxCount: 1,
    requireClass: "Artificer",
    requireSubclass: "Armorer",
    requireMinLevel: 3,
  });
}
registerSubclassSheetEffects("Artificer_Armorer", [
  // Infiltrator model — gated on Arcane Armor flag + model choice
  { type: "speed", speedType: "walk", value: 5, minLevel: 3,
    requiredChoice: { key: "armorer_model", value: "Infiltrator" },
    requiredItemFlag: { flag: "arcaneArmor", itemType: ["LA", "MA", "HA"], equipped: true }, note: "Powered Steps" },
  { type: "advantage", target: "skill", skill: "Stealth", minLevel: 3,
    requiredChoice: { key: "armorer_model", value: "Infiltrator" },
    requiredItemFlag: { flag: "arcaneArmor", itemType: ["LA", "MA", "HA"], equipped: true }, note: "Dampening Field" },
]);
registerSubclassSheetFeatureFilter("Artificer_Armorer", (ctx, features) => {
  const prefix = String(ctx?.choicePrefix || "");
  const choiceKey = prefix + "armorer_model";
  const raw = ctx?.choices?.[choiceKey];
  const first = Array.isArray(raw) ? raw[0] : raw;
  const nk = String(first || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  let selected = "";
  if (nk === "dreadnaught" || nk.includes("dreadnought")) selected = "dreadnought";
  else if (nk.includes("guardian")) selected = "guardian";
  else if (nk.includes("infiltrator")) selected = "infiltrator";
  if (!selected) return features || [];
  return (features || []).filter(f => {
    const fk = String(f?.name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    let tag = "";
    if (fk === "dreadnaught" || fk.includes("dreadnought")) tag = "dreadnought";
    else if (fk.includes("guardian")) tag = "guardian";
    else if (fk.includes("infiltrator")) tag = "infiltrator";
    if (!tag) return true;
    return tag === selected;
  });
});
// [SheetRuntime] END

if (typeof registerSubclassChoiceDetailDataProvider === "function") {
  registerSubclassChoiceDetailDataProvider("Artificer", "Armorer", function (choiceKey, values, subFeatures) {
    if (choiceKey !== "armorer_model") return null;
    if (!Array.isArray(values) || !values.length) return null;
    if (!Array.isArray(subFeatures) || !subFeatures.length) return null;

    function canon(v) {
      const k = String(v || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      if (k === "dreadnaught" || k.includes("dreadnought")) return "dreadnought";
      if (k.includes("guardian")) return "guardian";
      if (k.includes("infiltrator")) return "infiltrator";
      return "";
    }

    const target = canon(values[0]);
    if (!target) return null;

    const ordered = subFeatures.slice().sort(function (a, b) { return (a.level || 0) - (b.level || 0); });

    function walk(node) {
      if (!node) return null;
      if (Array.isArray(node)) {
        for (var i = 0; i < node.length; i++) { var r = walk(node[i]); if (r) return r; }
        return null;
      }
      if (typeof node !== "object") return null;
      if (node.name && canon(node.name) === target && (node.entries || node.entry)) return node;
      var kids = [node.entries, node.entry, node.items, node.rows];
      for (var j = 0; j < kids.length; j++) { var r2 = walk(kids[j]); if (r2) return r2; }
      return null;
    }

    var direct = ordered.find(function (f) { return canon(f && f.name) === target && (f.entries || f.entry); });
    if (direct) return direct;
    return walk(ordered.map(function (f) { return f.entries; }));
  });
}

}

