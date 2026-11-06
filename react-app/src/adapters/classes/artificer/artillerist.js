import { createAdapterBindings } from '../../adapterBindings.js';
import { getArtificerConditionalBonusToolCount } from './artificerTools.js';
import { getActiveCannons } from '../../../shared/character/forms/eldritchCannonForm.js';

export default function install(registry, context = {}) {
  const {
    _ARTISAN_TOOLS,
    registerSubclassAdapter,
    registerSubclassSheetActions,
    registerSubclassSheetResources,
    registerSubclassSheetProficiencies,
  } = createAdapterBindings(registry, context);
registerSubclassAdapter("Artificer_Artillerist", function (cls, lv, specs, ctx = {}) {
  if (lv < 3) return;
  const bonusCount = getArtificerConditionalBonusToolCount(ctx, ["Woodcarver's Tools"], cls);
  if (!bonusCount) return;
  specs.push({
    key: 'artillerist_bonus_tool',
    label: 'Artillerist - Bonus Artisan Tool',
    type: 'generic_choice',
    from: _ARTISAN_TOOLS,
    count: bonusCount,
    level: 3
  });
});

// [SheetRuntime] START
registerSubclassSheetActions("Artificer_Artillerist", [
  {
    "name": "Eldritch Cannon",
    "icon": "",
    "cat": "action",
    "uses": "1 / LR",
    "resKey": "eldritch_cannon",
    "minLevel": 3,
    detailType: 'eldritchCannon',
    _alsoFilters: ['bonus', { key: 'reaction', minLevel: 9 }],
    // Creating the cannon costs an Action, so the card always lives under
    // Actions; its Bonus/Reaction options only exist while a cannon is active.
    _alsoFiltersCondition: (C) => getActiveCannons(C).length > 0
  }
]);
registerSubclassSheetResources("Artificer_Artillerist", [
  {
    "key": "eldritch_cannon",
    "name": "Eldritch Cannon",
    "icon": "crosshair",
    "recharge": "LR",
    "max": () => 1
  }
]);
registerSubclassSheetProficiencies("Artificer_Artillerist", [
  { type: "tool", values: ["Woodcarver's Tools"], minLevel: 3 },
  { type: "weapon", values: ["Martial Ranged"], minLevel: 3 }
]);
// [SheetRuntime] END

}

