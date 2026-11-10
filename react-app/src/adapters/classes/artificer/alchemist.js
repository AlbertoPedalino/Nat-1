import { createAdapterBindings } from '../../adapterBindings.js';
import { getArtificerConditionalBonusToolCount } from './artificerTools.js';

export default function install(registry, context = {}) {
  const {
    _ARTISAN_TOOLS,
    registerSubclassAdapter,
    registerSubclassSheetActions,
    registerSubclassSheetResources,
    registerSubclassSheetEffects,
    registerSubclassSheetProficiencies,
  } = createAdapterBindings(registry, context);
registerSubclassAdapter("Artificer_Alchemist", function (cls, lv, specs, ctx = {}) {
  if (lv < 3) return;
  const bonusCount = getArtificerConditionalBonusToolCount(ctx, ["Alchemist's Supplies", "Herbalism Kit"], cls);
  if (!bonusCount) return;
  specs.push({
    key: 'alchemist_bonus_tool',
    label: 'Alchemist - Bonus Artisan Tool',
    type: 'generic_choice',
    from: _ARTISAN_TOOLS,
    count: bonusCount,
    level: 3
  });
});

registerSubclassSheetActions("Artificer_Alchemist", [
  {
    "name": "Experimental Elixir",
    
    "cat": "action",
    
    "minLevel": 3
  },
  {
    "name": "Restorative Reagents",
    
    "cat": "action",
    
    "resKey": "restorative_reagents",
    "minLevel": 9
  },
  {
    "name": "Chemical Mastery",
    
    "cat": "action",
    
    "resKey": "chemical_mastery",
    "minLevel": 15
  }
]);
registerSubclassSheetResources("Artificer_Alchemist", [
  {
    "key": "restorative_reagents",
    "name": "Restorative Reagents",
    
    "recharge": "LR",
    "max": "abilityMod:int", "minMax": 1
  },
  {
    "key": "chemical_mastery",
    "name": "Conjured Cauldron",
    
    "recharge": "LR",
    "max": () => 1
  }
]);
registerSubclassSheetProficiencies("Artificer_Alchemist", [
  { type: "tool", values: ["Alchemist's Supplies", "Herbalism Kit"], minLevel: 3 }
]);
registerSubclassSheetEffects("Artificer_Alchemist", [
  { type: "resistance", damageTypes: ["Acid", "Poison"], minLevel: 15, note: "Chemical Mastery" },
  { type: "immunity", conditions: ["Poisoned"], minLevel: 15, note: "Chemical Mastery" }
]);

}

