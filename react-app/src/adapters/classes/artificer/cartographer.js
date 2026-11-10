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
registerSubclassAdapter("Artificer_Cartographer", function (cls, lv, specs, ctx = {}) {
  if (lv < 3) return;
  const bonusCount = getArtificerConditionalBonusToolCount(ctx, ["Calligrapher's Supplies", "Cartographer's Tools"], cls);
  if (!bonusCount) return;
  specs.push({
    key: 'cartographer_bonus_tool',
    label: 'Cartographer - Bonus Artisan Tool',
    type: 'generic_choice',
    from: _ARTISAN_TOOLS,
    count: bonusCount,
    level: 3
  });
});

registerSubclassSheetActions("Artificer_Cartographer", [
  {
    "name": "Adventurer's Atlas",
    "cat": "action",
    "minLevel": 3
  },
  {
    "name": "Mapping Magic",
    "cat": "action",
    "resKey": "mapping_magic_faerie",
    "minLevel": 3
  },
  {
    "name": "Guided Precision",
    "cat": "attack",
    "minLevel": 5
  },
  {
    "name": "Superior Atlas",
    "cat": "action",
    "resKey": "superior_atlas_path",
    "minLevel": 15
  }
]);
registerSubclassSheetResources("Artificer_Cartographer", [
  {
    "key": "mapping_magic_faerie",
    "name": "Faerie Fire (Mapping Magic)",
    "recharge": "LR",
    "max": "abilityMod:int", "minMax": 1
  },
  {
    "key": "superior_atlas_path",
    "name": "Unerring Path",
    "recharge": "LR",
    "max": () => 1
  }
]);
registerSubclassSheetProficiencies("Artificer_Cartographer", [
  { type: "tool", values: ["Calligrapher's Supplies", "Cartographer's Tools"], minLevel: 3 }
]);

}

