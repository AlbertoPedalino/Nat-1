import { createAdapterBindings } from '../../adapterBindings.js';
import { getArtificerConditionalBonusToolCount } from './artificerTools.js';
import {
  REPLICATE_ARMORER_CHOICE_KEY,
  REPLICATE_GENERAL_CHOICE_KEY,
  isReplicateArmorItem,
} from '../../../shared/character/inventory/replicateMagicItem.js';
import { matchKey } from '../../../shared/content/nameKeys.js';
import { finalAbilityModifier } from '../../../shared/character/progression/abilityScores.js';
import { getProficiencyBonus } from '../../../shared/character/progression/proficiency.js';
import { baseChoiceKey } from '../../../shared/character/progression/choiceUtils.js';

export default function install(registry, context = {}) {
  const {
    _ARTISAN_TOOLS,
    registerSubclassAdapter,
    registerSubclassSheetActions,
    registerSubclassSheetResources,
    registerSubclassSheetEffects,
    registerItemFlagDef,
    registerSubclassSheetFeatureFilter,
    registerSubclassSheetProficiencies,
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

  if (lv >= 9) {
    const generalPlanSpec = specs.find((spec) => (
      baseChoiceKey(spec?.key || '') === REPLICATE_GENERAL_CHOICE_KEY
    ));
    if (generalPlanSpec) {
      specs.push({
        key: REPLICATE_ARMORER_CHOICE_KEY,
        label: 'Armorer - Additional Armor Replication Plan',
        type: 'replicate_magic_item',
        from: generalPlanSpec.from || [],
        count: 1,
        itemFilter: isReplicateArmorItem,
        level: 9,
      });
    }
  }

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

registerSubclassSheetActions("Artificer_Armorer", [
  {
    "name": "Arcane Armor",
    "icon": "",
    "cat": "action",
    "uses": "At will",
    "minLevel": 3,
    "choiceKey": "armorer_model",
    "choiceLabel": "Arcane Armor Model"
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
      try { return getProficiencyBonus(character) + finalAbilityModifier(character, 'int'); } catch { return 0; }
    },
    rollers: [{ kind: 'damage', formula: ({ character }) => {
      try {
        const intMod = finalAbilityModifier(character, 'int');
        return intMod > 0 ? `1d8+${intMod}` : intMod < 0 ? `1d8${intMod}` : '1d8';
      } catch { return '1d8'; }
    }, label: ({ formula }) => `${formula} thunder` }]
  },
  {
    "name": "Defensive Field",
    "icon": "",
    "cat": "bonus",
    "uses": "At will (while Bloodied)",
    "minLevel": 3,
    "requiresChoice": { "key": "armorer_model", "value": "Guardian" },
    "requiresInventoryFlag": { "flag": "arcaneArmor", "itemType": ["LA", "MA", "HA"], "equipped": true }
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
      try { return getProficiencyBonus(character) + finalAbilityModifier(character, 'int'); } catch { return 0; }
    },
    rollers: [{ kind: 'damage', formula: ({ character }) => {
      try {
        const intMod = finalAbilityModifier(character, 'int');
        return intMod > 0 ? `1d6+${intMod}` : intMod < 0 ? `1d6${intMod}` : '1d6';
      } catch { return '1d6'; }
    }, label: ({ formula }) => `${formula} lightning` }]
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
      try { return getProficiencyBonus(character) + finalAbilityModifier(character, 'int'); } catch { return 0; }
    },
    rollers: [{ kind: 'damage', formula: ({ character }) => {
      try {
        const intMod = finalAbilityModifier(character, 'int');
        return intMod > 0 ? `1d10+${intMod}` : intMod < 0 ? `1d10${intMod}` : '1d10';
      } catch { return '1d10'; }
    }, label: ({ formula }) => `${formula} force` }]
  },
  {
    "name": "Giant Stature",
    "icon": "",
    "cat": "bonus",
    "uses": "INT mod / LR",
    "resKey": "armorer_giant_stature",
    "minLevel": 3,
    "requiresChoice": { "key": "armorer_model", "value": "Dreadnaught" },
    "requiresInventoryFlag": { "flag": "arcaneArmor", "itemType": ["LA", "MA", "HA"], "equipped": true }
  },
  {
    "name": "Perfected Armor (Guardian)",
    "icon": "",
    "cat": "reaction",
    "uses": "INT mod / LR",
    "resKey": "perfected_guardian",
    "minLevel": 15,
    "requiresChoice": { "key": "armorer_model", "value": "Guardian" }
  },
  {
    "name": "Perfected Armor (Infiltrator)",
    "icon": "",
    "cat": "bonus",
    "uses": "INT mod / LR",
    "resKey": "perfected_infiltrator",
    "minLevel": 15,
    "requiresChoice": { "key": "armorer_model", "value": "Infiltrator" }
  },
  {
    "name": "Perfected Armor (Dreadnaught)",
    "icon": "",
    "cat": "bonus",
    "uses": "INT mod / LR",
    "resKey": "armorer_giant_stature",
    "minLevel": 15,
    "requiresChoice": { "key": "armorer_model", "value": "Dreadnaught" }
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
registerItemFlagDef("arcaneArmor", {
  label: "Arcane Armor",
  activeLabel: "Arcane",
  tone: "#58b879",
  icon: "shield",
  types: ['LA','MA','HA'],
  maxCount: 1,
  requireClass: "Artificer",
  requireSubclass: "Armorer",
  requireMinLevel: 3,
});
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
  const nk = matchKey(first);
  let selected = "";
  if (nk === "dreadnaught" || nk.includes("dreadnought")) selected = "dreadnought";
  else if (nk.includes("guardian")) selected = "guardian";
  else if (nk.includes("infiltrator")) selected = "infiltrator";
  if (!selected) return features || [];
  return (features || []).filter(f => {
    const fk = matchKey(f?.name);
    let tag = "";
    if (fk === "dreadnaught" || fk.includes("dreadnought")) tag = "dreadnought";
    else if (fk.includes("guardian")) tag = "guardian";
    else if (fk.includes("infiltrator")) tag = "infiltrator";
    if (!tag) return true;
    return tag === selected;
  });
});

}

