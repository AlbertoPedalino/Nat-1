import { createAdapterBindings } from '../../adapterBindings.js';
import { getArtificerConditionalBonusToolCount } from './artificerTools.js';

export default function install(registry, context = {}) {
  const {
    _ARTISAN_TOOLS,
    registerSubclassAdapter,
    registerSubclassSheetActions,
    registerSubclassSheetResources,
    registerSubclassSheetProficiencies,
  } = createAdapterBindings(registry, context);
registerSubclassAdapter("Artificer_Battle Smith", function (cls, lv, specs, ctx = {}) {
  if (lv < 3) return;
  const bonusCount = getArtificerConditionalBonusToolCount(ctx, ["Smith's Tools"], cls);
  if (!bonusCount) return;
  specs.push({
    key: 'battlesmith_bonus_tool',
    label: 'Battle Smith - Bonus Artisan Tool',
    type: 'generic_choice',
    from: _ARTISAN_TOOLS,
    count: bonusCount,
    level: 3
  });
});

registerSubclassSheetActions("Artificer_Battle Smith", [
  {
    "name": "Steel Defender",
    "icon": "",
    "cat": "bonus",
    "uses": "Bonus Action (command)",
    "minLevel": 3
  },
  {
    "name": "Arcane Jolt",
    "icon": "",
    "cat": "attack",
    "uses": "INT mod / LR",
    "resKey": "arcane_jolt",
    "minLevel": 9,
    rollers: [{ kind: 'damage', formula: ({ ownerLevel }) => Number(ownerLevel || 1) >= 15 ? '4d6' : '2d6', label: ({ formula }) => `+${formula} force` }],
    "rollLabelPrefix": "Arcane Jolt"
  }
]);
registerSubclassSheetResources("Artificer_Battle Smith", [
  {
    "key": "arcane_jolt",
    "name": "Arcane Jolt",
    "icon": "zap",
    "recharge": "LR",
    "max": "abilityMod:int", "minMax": 1
  }
]);
registerSubclassSheetProficiencies("Artificer_Battle Smith", [
  { type: "tool", values: ["Smith's Tools"], minLevel: 3 }
]);

}

