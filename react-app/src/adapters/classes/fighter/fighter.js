import { createAdapterBindings } from '../../adapterBindings.js';
import { withModifier } from '../../../shared/ui/numberFormat.js';

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

registerClassSheetActions("Fighter", [
  {
    name: 'Second Wind',
    
    cat: 'bonus',
    
    resKey: 'second_wind',
    rollers: [{ kind: 'heal', formula: ({ ownerLevel }) => {
      const lvNum = Number(ownerLevel || 1);
      return withModifier('1d10', lvNum);
    } }],
    rollLabelPrefix: 'Heal'
  },
  {
    name: 'Action Surge',
    
    cat: 'action',
    
    resKey: 'action_surge',
    minLevel: 2
  },
  {
    name: 'Tactical Mind',
    
    cat: 'special',
    
    minLevel: 2,
    rollers: [{ kind: 'utility', formula: '1d10', label: '1d10', title: 'Bonus' }],
    rollLabelPrefix: 'Tactical Mind'
  },
  {
    name: 'Indomitable',
    
    cat: 'special',
    
    resKey: 'indomitable',
    minLevel: 9
  }
]);
registerClassSheetResources("Fighter", [
  {
    key: 'second_wind',
    name: 'Second Wind',
    
    recharge: 'SR',
    max: (lv)=>lv>=10?4:lv>=4?3:2
  },
  {
    key: 'action_surge',
    name: 'Action Surge',
    
    recharge: 'SR',
    max: (lv)=>lv>=17?2:1
  },
  {
    key: 'indomitable',
    name: 'Indomitable',
    
    recharge: 'LR',
    max: (lv)=>lv>=17?3:lv>=13?2:1
  }
]);
}
