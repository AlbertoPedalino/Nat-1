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

// [SheetRuntime] START
registerSubclassSheetActions("Artificer_Cartographer", [
  {
    "name": "Adventurer's Atlas",
    "icon": "",
    "cat": "action",
    "uses": "After Long Rest",
    "minLevel": 3
  },
  {
    "name": "Mapping Magic",
    "icon": "",
    "cat": "action",
    "uses": "INT mod / LR",
    "resKey": "mapping_magic_faerie",
    "minLevel": 3
  },
  {
    "name": "Guided Precision",
    "icon": "",
    "cat": "attack",
    "uses": "1 / turn",
    "minLevel": 5
  },
  {
    "name": "Superior Atlas",
    "icon": "",
    "cat": "action",
    "uses": "1 / LR",
    "resKey": "superior_atlas_path",
    "minLevel": 15
  }
]);
registerSubclassSheetResources("Artificer_Cartographer", [
  {
    "key": "mapping_magic_faerie",
    "name": "Faerie Fire (Mapping Magic)",
    "icon": "sparkles",
    "recharge": "LR",
    "max": (lv, { int } = {}) => Math.max(1, int ?? 0)
  },
  {
    "key": "superior_atlas_path",
    "name": "Unerring Path",
    "icon": "map",
    "recharge": "LR",
    "max": () => 1
  }
]);
registerSubclassSheetProficiencies("Artificer_Cartographer", [
  { type: "tool", values: ["Calligrapher's Supplies", "Cartographer's Tools"], minLevel: 3 }
]);
// [SheetRuntime] END

}

