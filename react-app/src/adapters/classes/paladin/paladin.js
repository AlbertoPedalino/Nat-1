import { createAdapterBindings } from '../../adapterBindings.js';

export default function install(registry, context = {}) {
  const {
    allItemsDb,
    getWeaponMasteryChoiceCount,
    getWeaponMasteryChoiceNames,
    WEAPON_MASTERY_RULES,
    registerClassAdapter,
    registerClassSheetActions,
    registerClassSheetResources,
  } = createAdapterBindings(registry, context);
registerClassAdapter("Paladin", function (cls, lv, specs, ctx = {}) {
  if (lv >= 1) {
    const weapons = getWeaponMasteryChoiceNames(ctx.items, allItemsDb, WEAPON_MASTERY_RULES.paladin);
    specs.push({
      key: 'paladin_weapon_mastery',
      label: 'Weapon Mastery (Paladin)',
      type: 'generic_choice',
      from: weapons,
      count: getWeaponMasteryChoiceCount('paladin', lv),
      level: 1
    });
  }
  if (lv >= 2) {
    specs.push({
      key: 'paladin_fighting_style',
      label: 'Fighting Style',
      type: 'feat_cat',
      categories: ['FS', 'FS:P'],
      count: 1,
      level: 2
    });
  }
  if (lv >= 19) {
    specs.push({ key: 'paladin_epic_boon', label: 'Epic Boon', type: 'feat_cat', categories: ['EB'], count: 1, level: 19 });
  }
});

// [SheetRuntime] START
registerClassSheetActions("Paladin", [
  {
    "name": "Divine Sense",
    "icon": "",
    "cat": "bonus",
    "uses": "1 Channel",
    "resKey": "paladin_channel_div",
    "minLevel": 3
  },
  {
    "name": "Lay on Hands",
    "icon": "",
    "cat": "bonus",
    "uses": "Pool / LR",
    "resKey": "lay_on_hands"
  },
  {
    "name": "Abjure Foes",
    "icon": "",
    "cat": "action",
    "uses": "1 Channel",
    "resKey": "paladin_channel_div",
    "minLevel": 9
  },
  {
    "name": "Restoring Touch",
    "icon": "",
    "cat": "action",
    "uses": "Pool / LR",
    "resKey": "lay_on_hands",
    "minLevel": 14
  }
]);
registerClassSheetResources("Paladin", [
  {
    "key": "lay_on_hands",
    "name": "Lay on Hands",
    "icon": "hands",
    "recharge": "LR",
    "max": (lv)=>lv*5,
    "pool": true,
    "track": "used"
  },
  {
    "key": "paladin_channel_div",
    "name": "Channel Divinity",
    "actionGroup": "Channel Divinity",
    "icon": "sparkles",
    "recharge": "SR",
    "max": (lv)=>lv>=11?3:lv>=3?2:0
  }
]);
// [SheetRuntime] END

}
