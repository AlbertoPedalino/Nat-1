import { createAdapterBindings } from '../../adapterBindings.js';

export default function install(registry, context = {}) {
  const {
    SKILLS,
    _ALL_LANGS,
    allItemsDb,
    getWeaponMasteryChoiceCount,
    getWeaponMasteryChoiceNames,
    WEAPON_MASTERY_RULES,
    registerClassAdapter,
    registerClassSheetActions,
    registerClassSheetResources,
  } = createAdapterBindings(registry, context);
registerClassAdapter("Ranger", function (cls, lv, specs, ctx = {}) {
  const skills = SKILLS.map(function (s) { return s.n; });
  if (lv >= 1) {
    const weapons = getWeaponMasteryChoiceNames(ctx.items, allItemsDb, WEAPON_MASTERY_RULES.ranger);
    specs.push({
      key: 'ranger_weapon_mastery',
      label: 'Weapon Mastery (Ranger)',
      type: 'generic_choice',
      from: weapons,
      count: getWeaponMasteryChoiceCount('ranger', lv),
      level: 1
    });
  }
  if (lv >= 2) {
    specs.push({
      key: 'ranger_expertise_lv2',
      label: 'Deft Explorer — Expertise',
      type: 'expertise',
      from: skills,
      count: 1,
      level: 2,
      requiresProficiency: true
    });
    specs.push({
      key: 'ranger_deft_explorer_languages',
      label: 'Deft Explorer — Languages',
      type: 'language_choice',
      from: _ALL_LANGS || [],
      count: 2,
      level: 2
    });
    specs.push({
      key: 'ranger_fighting_style',
      label: 'Fighting Style',
      type: 'feat_cat',
      categories: ['FS', 'FS:R'],
      count: 1,
      level: 2
    });
  }
  if (lv >= 9) {
    specs.push({
      key: 'ranger_expertise_lv9',
      label: 'Expertise (Ranger Lv.9)',
      type: 'expertise',
      from: skills,
      count: 2,
      level: 9,
      requiresProficiency: true
    });
  }
  if (lv >= 19) {
    specs.push({ key: 'ranger_epic_boon', label: 'Epic Boon', type: 'feat_cat', categories: ['EB'], count: 1, level: 19 });
  }
});

registerClassSheetActions("Ranger", [
  {
    "name": "Tireless",
    "icon": "",
    "cat": "action",
    "uses": "WIS mod / LR",
    "resKey": "ranger_tireless",
    "minLevel": 10
  },
  {
    "name": "Nature's Veil",
    "icon": "",
    "cat": "bonus",
    "uses": "WIS mod / LR",
    "resKey": "natures_veil",
    "minLevel": 14
  }
]);
registerClassSheetResources("Ranger", [
  {
    "key": "ranger_tireless",
    "name": "Tireless",
    "icon": "heart",
    "recharge": "LR",
    "minLevel": 10,
    "max": (lv, { wis } = {}) => Math.max(1, wis ?? 0)
  },
  {
    "key": "natures_veil",
    "name": "Nature's Veil",
    "icon": "eye-off",
    "recharge": "LR",
    "minLevel": 14,
    "max": (lv, { wis } = {}) => Math.max(1, wis ?? 0)
  }
]);

}
