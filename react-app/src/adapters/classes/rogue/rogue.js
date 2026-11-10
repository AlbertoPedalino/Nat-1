import { createAdapterBindings } from '../../adapterBindings.js';
import { SKILL_NAMES } from '../../../shared/content/rulesVocabulary.js';

export default function install(registry, context = {}) {
  const {
    allItemsDb,
    getWeaponMasteryChoiceCount,
    getWeaponMasteryChoiceNames,
    WEAPON_MASTERY_RULES,
    registerClassAdapter,
    registerClassSheetActions,
    registerClassSheetResources,
    registerClassSheetProficiencies,
  } = createAdapterBindings(registry, context);
registerClassAdapter("Rogue", function (cls, lv, specs, ctx = {}) {
  const expertiseFrom = SKILL_NAMES.concat(["Thieves' Tools"]);
  const weapons = getWeaponMasteryChoiceNames(ctx.items, allItemsDb, WEAPON_MASTERY_RULES.rogue);

  if (lv >= 1) {
    specs.push({
      key: 'rogue_expertise_lv1',
      label: 'Expertise (Rogue Lv.1)',
      type: 'expertise',
      from: expertiseFrom,
      count: 2,
      level: 1,
      requiresProficiency: true
    });
    specs.push({
      key: 'rogue_weapon_mastery',
      label: 'Weapon Mastery (Rogue)',
      type: 'generic_choice',
      from: weapons,
      count: getWeaponMasteryChoiceCount('rogue', lv),
      level: 1
    });
  }
  if (lv >= 6) {
    specs.push({
      key: 'rogue_expertise_lv6',
      label: 'Expertise (Rogue Lv.6)',
      type: 'expertise',
      from: expertiseFrom,
      count: 2,
      level: 6,
      requiresProficiency: true
    });
  }
  if (lv >= 19) {
    specs.push({ key: 'rogue_epic_boon', label: 'Epic Boon', type: 'feat_cat', categories: ['EB'], count: 1, level: 19 });
  }
});

registerClassSheetActions("Rogue", [
  {
    "name": "Sneak Attack",
    
    "cat": "attack",
    
    rollers: [{ kind: 'damage', formula: ({ ownerLevel }) => {
      const lv = Number(ownerLevel || 1);
      const dice = Math.max(1, Math.ceil(lv / 2));
      return `${dice}d6`;
    }, label: ({ formula }) => `${String(formula || '')} extra` }],
    "rollLabelPrefix": "Damage"
  },
  {
    "name": "Cunning Action",
    
    "cat": "bonus",
    
    "minLevel": 2
  },
  {
    "name": "Steady Aim",
    
    "cat": "bonus",
    
    "minLevel": 3
  },
  {
    "name": "Uncanny Dodge",
    
    "cat": "reaction",
    
    "minLevel": 5
  },
  {
    "name": "Cunning Strike",
    
    "cat": "attack",
    
    "minLevel": 5
  },
  {
    "name": "Improved Cunning Strike",
    
    "cat": "attack",
    
    "minLevel": 11
  },
  {
    "name": "Devious Strikes",
    
    "cat": "attack",
    
    "minLevel": 14
  },
  {
    "name": "Stroke of Luck",
    
    "cat": "action",
    
    "resKey": "stroke_of_luck",
    "minLevel": 20
  }
]);
registerClassSheetResources("Rogue", [
  {
    "key": "stroke_of_luck",
    "name": "Stroke of Luck",
    
    "recharge": "LR",
    "max": () => 1
  }
]);
registerClassSheetProficiencies("Rogue", [
  {
    type: "weapon",
    values: ["Martial weapons with Finesse or Light property"],
    match: { category: "martial", propertiesAny: ["F", "L"] },
    display: false,
    minLevel: 1
  },
  { type: "language", values: ["Thieves' Cant"], minLevel: 1 }
]);

}
