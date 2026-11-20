import { createAdapterBindings } from '../../adapterBindings.js';
import { getArtificerConditionalBonusToolCount } from './artificerTools.js';
import { getActiveCannons } from '../../../shared/character/forms/eldritchCannonForm.js';
import { isRodStaffOrWand } from '../../../shared/character/inventory/itemKinds.js';
import { inferRuleFromLabel, weaponMatchesRule } from '../../../shared/character/proficiency/weaponRules.js';

// Arcane Firearm (level 5): the sigils go on a Rod, Staff, Wand or Martial
// Ranged weapon — "Martial Ranged" read as the proficiency rules read it.
const MARTIAL_RANGED = inferRuleFromLabel('Martial Ranged');
const fitsArcaneFirearm = (item) => isRodStaffOrWand(item) || weaponMatchesRule(item, MARTIAL_RANGED);

export default function install(registry, context = {}) {
  const {
    _ARTISAN_TOOLS,
    registerSubclassAdapter,
    registerSubclassSheetActions,
    registerSubclassSheetResources,
    registerSubclassSheetProficiencies,
    registerItemFlagDef,
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

registerSubclassSheetActions("Artificer_Artillerist", [
  {
    "name": "Eldritch Cannon",
    "cat": "action",
    "resKey": "eldritch_cannon",
    "minLevel": 3,
    detailType: 'eldritchCannon',
    _alsoFilters: ['bonus', { key: 'reaction', minLevel: 9 }],
    // Creating the cannon costs an Action, so the card always lives under
    // Actions; its Bonus/Reaction options only exist while a cannon is active.
    _alsoFiltersCondition: (C) => getActiveCannons(C).length > 0
  },
  {
    name: "Arcane Firearm",
    cat: "special",
    minLevel: 5,
    // The card picks the item carrying the sigils (the `arcaneFirearm` flag);
    // its text is the subclass feature's, found by name like every card.
    detailType: 'itemFlagPicker',
    itemFlag: 'arcaneFirearm',
  }
]);
// The item carrying the sigils: one at a time (carving them elsewhere moves
// them). A weapon so marked rolls the 1d8 in its damage roll — on its own card
// and through True Strike, where the cantrip's dice join the same roll.
registerItemFlagDef("arcaneFirearm", {
  label: "Arcane Firearm",
  activeLabel: "Firearm",
  fits: fitsArcaneFirearm,
  maxCount: 1,
  weaponDamageDice: '1d8',
  requireClass: "Artificer",
  requireSubclass: "Artillerist",
  requireMinLevel: 5,
});
registerSubclassSheetResources("Artificer_Artillerist", [
  {
    "key": "eldritch_cannon",
    "name": "Eldritch Cannon",
    "recharge": "LR",
    "max": () => 1
  }
]);
registerSubclassSheetProficiencies("Artificer_Artillerist", [
  { type: "tool", values: ["Woodcarver's Tools"], minLevel: 3 },
  { type: "weapon", values: ["Martial Ranged"], minLevel: 3 }
]);

}

