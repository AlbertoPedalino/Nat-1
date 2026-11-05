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

registerClassAdapter("Fighter", function (cls, lv, specs, ctx = {}) {
  if (lv >= 1) {
    const weapons = getWeaponMasteryChoiceNames(ctx.items, allItemsDb, WEAPON_MASTERY_RULES.fighter);
    specs.push({
      key: 'fighter_weapon_mastery',
      label: 'Weapon Mastery (Fighter)',
      type: 'generic_choice',
      from: weapons,
      count: getWeaponMasteryChoiceCount('fighter', lv),
      level: 1
    });
    specs.push({
      key: 'fighter_fighting_style',
      label: 'Fighting Style',
      type: 'feat_cat',
      categories: ['FS'],
      count: 1,
      level: 1
    });
  }
  if (lv >= 19) {
    specs.push({
      key: 'fighter_epic_boon',
      label: 'Epic Boon',
      type: 'feat_cat',
      categories: ['EB'],
      count: 1,
      level: 19
    });
  }
});

// [SheetRuntime] START
registerClassSheetActions("Fighter", [
  {
    name: 'Second Wind',
    icon: '',
    cat: 'bonus',
    uses: '1-3 / SR',
    resKey: 'second_wind',
    rollers: [{ kind: 'heal', formula: ({ ownerLevel }) => {
      const lvNum = Number(ownerLevel || 1);
      return `1d10${lvNum >= 0 ? '+' : ''}${lvNum}`;
    } }],
    rollLabelPrefix: 'Heal'
  },
  {
    name: 'Action Surge',
    icon: '',
    cat: 'action',
    uses: '1-2 / SR',
    resKey: 'action_surge',
    minLevel: 2
  },
  {
    name: 'Tactical Mind',
    icon: '',
    cat: 'special',
    uses: 'Second Wind',
    minLevel: 2,
    rollers: [{ kind: 'utility', formula: '1d10', label: '1d10', title: 'Bonus' }],
    rollLabelPrefix: 'Tactical Mind'
  },
  {
    name: 'Indomitable',
    icon: '',
    cat: 'special',
    uses: '1-3 / LR',
    resKey: 'indomitable',
    minLevel: 9
  }
]);
registerClassSheetResources("Fighter", [
  {
    key: 'second_wind',
    name: 'Second Wind',
    icon: 'wind',
    recharge: 'SR',
    max: (lv)=>lv>=10?4:lv>=4?3:2
  },
  {
    key: 'action_surge',
    name: 'Action Surge',
    icon: 'zap',
    recharge: 'SR',
    max: (lv)=>lv>=17?2:1
  },
  {
    key: 'indomitable',
    name: 'Indomitable',
    icon: 'shield',
    recharge: 'LR',
    max: (lv)=>lv>=17?3:lv>=13?2:1
  }
]);
// [SheetRuntime] END
}
