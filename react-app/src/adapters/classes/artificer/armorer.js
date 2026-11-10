import { createAdapterBindings } from '../../adapterBindings.js';
import { getArtificerConditionalBonusToolCount } from './artificerTools.js';
import {
  REPLICATE_ARMORER_CHOICE_KEY,
  REPLICATE_GENERAL_CHOICE_KEY,
  isReplicateArmorItem,
} from '../../../shared/character/inventory/replicateMagicItem.js';
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
    "cat": "action",
    "minLevel": 3,
    "choiceKey": "armorer_model",
    "choiceLabel": "Arcane Armor Model"
  },
  {
    "name": "Thunder Pulse",
    "cat": "attack",
    "minLevel": 3,
    "requiredChoice": { "key": "armorer_model", "value": "Guardian" },
    "requiredItemFlag": { "flag": "arcaneArmor", "itemType": ["LA", "MA", "HA"], "equipped": true },
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
    "cat": "bonus",
    "minLevel": 3,
    "requiredChoice": { "key": "armorer_model", "value": "Guardian" },
    "requiredItemFlag": { "flag": "arcaneArmor", "itemType": ["LA", "MA", "HA"], "equipped": true }
  },
  {
    "name": "Lightning Launcher",
    "cat": "attack",
    "minLevel": 3,
    "requiredChoice": { "key": "armorer_model", "value": "Infiltrator" },
    "requiredItemFlag": { "flag": "arcaneArmor", "itemType": ["LA", "MA", "HA"], "equipped": true },
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
    "cat": "attack",
    "minLevel": 3,
    "requiredChoice": { "key": "armorer_model", "value": "Dreadnaught" },
    "requiredItemFlag": { "flag": "arcaneArmor", "itemType": ["LA", "MA", "HA"], "equipped": true },
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
    "cat": "bonus",
    "resKey": "armorer_giant_stature",
    "minLevel": 3,
    "requiredChoice": { "key": "armorer_model", "value": "Dreadnaught" },
    "requiredItemFlag": { "flag": "arcaneArmor", "itemType": ["LA", "MA", "HA"], "equipped": true }
  },
  {
    "name": "Perfected Armor (Guardian)",
    "cat": "reaction",
    "resKey": "perfected_guardian",
    "minLevel": 15,
    "requiredChoice": { "key": "armorer_model", "value": "Guardian" }
  },
  {
    "name": "Perfected Armor (Infiltrator)",
    "cat": "bonus",
    "resKey": "perfected_infiltrator",
    "minLevel": 15,
    "requiredChoice": { "key": "armorer_model", "value": "Infiltrator" }
  },
  {
    "name": "Perfected Armor (Dreadnaught)",
    "cat": "bonus",
    "resKey": "armorer_giant_stature",
    "minLevel": 15,
    "requiredChoice": { "key": "armorer_model", "value": "Dreadnaught" }
  }
]);
registerSubclassSheetResources("Artificer_Armorer", [
  {
    "key": "armorer_giant_stature",
    "name": "Giant Stature",
    "recharge": "LR",
    "max": "abilityMod:int", "minMax": 1,
    "requiredChoice": { "key": "armorer_model", "value": "Dreadnaught" },
    "requiredItemFlag": { "flag": "arcaneArmor", "itemType": ["LA", "MA", "HA"], "equipped": true }
  },
  {
    "key": "perfected_guardian",
    "name": "Perfected Guardian Pull",
    "recharge": "LR",
    "max": "abilityMod:int", "minMax": 1,
    "requiredChoice": { "key": "armorer_model", "value": "Guardian" },
    "requiredItemFlag": { "flag": "arcaneArmor", "itemType": ["LA", "MA", "HA"], "equipped": true }
  },
  {
    "key": "perfected_infiltrator",
    "name": "Infiltrator Fly",
    "recharge": "LR",
    "max": "abilityMod:int", "minMax": 1,
    "requiredChoice": { "key": "armorer_model", "value": "Infiltrator" },
    "requiredItemFlag": { "flag": "arcaneArmor", "itemType": ["LA", "MA", "HA"], "equipped": true }
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
}

