import { createAdapterBindings } from '../../adapterBindings.js';

export default function install(registry, context = {}) {
  const {
    SKILLS,
    _ARTISAN_TOOLS,
    _MUSICAL_INSTRUMENTS,
    _GAMING_SETS,
    _VEHICLE_TOOLS,
    _STD_LANGS,
    _EXOTIC_LANGS,
    _ALL_LANGS,
    _ALL_TOOLS,
    allItemsDb,
    registerClassAdapter,
    getClassAdapter,
    registerSubclassAdapter,
    getSubclassAdapter,
    registerSpeciesAdapter,
    getSpeciesAdapter,
    registerFeatAdapter,
    getFeatAdapter,
    registerClassSheetActions,
    getClassSheetActions,
    registerSubclassSheetActions,
    getSubclassSheetActions,
    registerSpeciesSheetActions,
    getSpeciesSheetActions,
    registerFeatSheetActions,
    getFeatSheetActions,
    registerClassSheetResources,
    getClassSheetResources,
    registerSubclassSheetResources,
    getSubclassSheetResources,
    registerSpeciesSheetResources,
    getSpeciesSheetResources,
    registerFeatSheetResources,
    getFeatSheetResources,
    registerClassSheetEffects,
    getClassSheetEffects,
    registerSubclassSheetEffects,
    getSubclassSheetEffects,
    registerSpeciesSheetEffects,
    getSpeciesSheetEffects,
    registerFeatSheetEffects,
    getFeatSheetEffects,
    registerClassRuntimeConfig,
    getClassRuntimeConfig,
    registerSubclassRuntimeConfig,
    getSubclassRuntimeConfig,
    registerSpeciesRuntimeConfig,
    getSpeciesRuntimeConfig,
    registerClassSheetChoiceMeta,
    getClassSheetChoiceMeta,
    registerSubclassSheetChoiceMeta,
    getSubclassSheetChoiceMeta,
    registerSpeciesSheetChoiceMeta,
    getSpeciesSheetChoiceMeta,
    registerClassSheetCommonChoiceMeta,
    registerSubclassSheetCommonChoiceMeta,
    registerSpeciesSheetCommonChoiceMeta,
    registerItemFlagDef,
    getItemFlagDef,
    getAllItemFlagDefs,
    registerWeaponAbilityOverride,
    getWeaponAbilityOverrides,
    registerClassSheetFeatureFilter,
    getClassSheetFeatureFilters,
    registerSubclassSheetFeatureFilter,
    getSubclassSheetFeatureFilters,
    registerSpeciesSheetFeatureFilter,
    getSpeciesSheetFeatureFilters,
    registerClassSheetProficiencies,
    getClassSheetProficiencies,
    registerSubclassSheetProficiencies,
    getSubclassSheetProficiencies,
    registerSpeciesSheetProficiencies,
    getSpeciesSheetProficiencies,
    registerClassSheetSpellModifiers,
    getClassSheetSpellModifiers,
    registerSubclassSheetSpellModifiers,
    getSubclassSheetSpellModifiers,
    registerSpeciesSheetSpellModifiers,
    getSpeciesSheetSpellModifiers,
    registerClassChoiceKeyFilter,
    getClassChoiceKeyFilter,
    registerClassChoiceLabelProvider,
    getClassChoiceLabelProvider,
    registerSpeciesSheetHpBonus,
    getSpeciesSheetHpBonus,
    registerClassAtWillSpells,
    getClassAtWillSpells,
    registerSpeciesLongRestGrants,
    getSpeciesLongRestGrants,
    registerResourceSideEffect,
    getResourceSideEffect,
    registerSubclassChoiceDetailDataProvider,
    getSubclassChoiceDetailDataProvider,
    registerGlobalClassAdapter,
    getGlobalClassAdapters,
    registerGlobalSubclassAdapter,
    getGlobalSubclassAdapters,
    registerGlobalSpeciesAdapter,
    getGlobalSpeciesAdapters,
    registerGlobalFeatAdapter,
    getGlobalFeatAdapters,
    registerGlobalSpellAdapter,
    getGlobalSpellAdapters,
    registerGlobalItemAdapter,
    getGlobalItemAdapters,
    registerCantripData,
    getCantripData,
    registerCantripDataModifier,
    getCantripDataModifiers,
    registerSpellData,
    getSpellData,
    getGenericSpeciesChoiceSpecs,
    getGenericBackgroundChoiceSpecs,
    getGenericBackgroundChoiceMeta,
    getGenericBackgroundOriginFeat,
  } = createAdapterBindings(registry, context);
registerClassAdapter("Barbarian", function (cls, lv, specs) {
  if (lv >= 1) {
    const weapons = typeof allItemsDb !== 'undefined'
      ? allItemsDb
          .filter(function (i) { return (i.type === 'M' || i.type === 'R') && (!i.rarity || i.rarity === 'none'); })
          .map(function (i) { return i.name; })
      : [];
    specs.push({
      key: 'barbarian_weapon_mastery',
      label: 'Weapon Mastery (choose 2)',
      type: 'generic_choice',
      from: weapons,
      count: 2,
      level: 1
    });
  }
  if (lv >= 3) {
    const allSkills = typeof SKILLS !== 'undefined'
      ? SKILLS.map(function (s) { return s.n; })
      : ['Acrobatics','Animal Handling','Arcana','Athletics','Perception',
         'Sleight of Hand','Stealth','Investigation','Deception','Insight',
         'Intimidation','Medicine','Nature','History','Performance',
         'Persuasion','Religion','Survival'];
    specs.push({
      key: 'barbarian_primal_knowledge',
      label: 'Primal Knowledge (Extra Skill)',
      type: 'skill_choice',
      from: allSkills,
      count: 1,
      level: 3
    });
  }
  if (lv >= 19) {
    specs.push({ key: 'barbarian_epic_boon', label: 'Epic Boon', type: 'feat_cat', categories: ['EB'], count: 1, level: 19 });
  }
});

function _barbarianRaging(C) { return !!C && C.rageActive === true; }

registerClassSheetEffects("Barbarian", [
  { type: "acFormula", key: "barbarian_unarmored_defense", label: "Unarmored Defense", base: 10, abilities: ["dex", "con"], allowShield: true, minLevel: 1, requiresNoArmor: true },
  // Danger Sense: Advantage on DEX saves (unless Incapacitated).
  { type: "advantage", target: "save", ability: "dex", minLevel: 2, note: "Danger Sense" },
  // Rage (while active): Advantage on STR saves + Rage Damage to STR melee attacks.
  { type: "advantage", target: "save", ability: "str", minLevel: 1, note: "Rage", condition: _barbarianRaging },
  { type: "meleeDamageBonus", ability: "str", value: 2, minLevel: 1,  note: "Rage", condition: _barbarianRaging },
  { type: "meleeDamageBonus", ability: "str", value: 3, minLevel: 9,  note: "Rage", condition: _barbarianRaging },
  { type: "meleeDamageBonus", ability: "str", value: 4, minLevel: 16, note: "Rage", condition: _barbarianRaging },
]);

// [SheetRuntime] START
registerClassSheetActions("Barbarian", [
  {
    "name": "Unarmored Defense",
    "icon": "",
    "cat": "action",
    "uses": "Passive",
    "passive": true,
    "desc": "While not wearing armor: your AC equals 10 + DEX modifier + CON modifier. You can use a Shield and still gain this benefit."
  },
  {
    "name": "Rage",
    "icon": "",
    "cat": "bonus",
    "uses": "2+ / LR (+1 SR)",
    "resKey": "rage",
    "_toggleKey": "rage",
    "_toggleCondition": function (ctx) {
      var C = ctx && ctx.C;
      var hasHeavyArmor = (C && C.inventory || []).some(function (i) {
        return i.equipped && String(i.type || '').toUpperCase() === 'HA';
      });
      return { canActivate: !hasHeavyArmor, isSuppressed: hasHeavyArmor };
    },
    "desc": "Bonus Action. Enter Rage for 1 minute: +2 damage on attacks (→+3 lv.9, →+4 lv.16), resistance to Bludgeoning/Piercing/Slashing, advantage on STR checks and saves. Uses: 2 (lv.1), 3 (lv.3), 4 (lv.6), 5 (lv.12), 6 (lv.17), unlimited (lv.20). Recharge: Long Rest; recover 1 expended use on a Short Rest. Ends if you don Heavy Armor."
  },
  {
    "name": "Reckless Attack",
    "icon": "",
    "cat": "attack",
    "uses": "Unlimited",
    "minLevel": 2,
    "desc": "When you make your first attack on your turn, gain advantage on all weapon attack rolls using STR this turn. Enemies gain advantage on attack rolls against you until the start of your next turn."
  },
  {
    "name": "Danger Sense",
    "icon": "",
    "cat": "reaction",
    "uses": "Passive",
    "passive": true,
    "minLevel": 2,
    "desc": "You have Advantage on Dexterity saving throws unless you have the Incapacitated condition."
  },
  {
    "name": "Extra Attack",
    "icon": "",
    "cat": "attack",
    "uses": "Passive",
    "passive": true,
    "minLevel": 5,
    "desc": "You can attack twice, instead of once, whenever you take the Attack action on your turn."
  },
  {
    "name": "Fast Movement",
    "icon": "",
    "cat": "action",
    "uses": "Passive",
    "passive": true,
    "minLevel": 5,
    "desc": "Your Speed increases by 10 ft while you aren't wearing Heavy Armor."
  },
  {
    "name": "Feral Instinct",
    "icon": "",
    "cat": "action",
    "uses": "Passive",
    "passive": true,
    "minLevel": 7,
    "desc": "You have Advantage on Initiative rolls."
  },
  {
    "name": "Instinctive Pounce",
    "icon": "",
    "cat": "action",
    "uses": "Passive",
    "passive": true,
    "minLevel": 7,
    "desc": "When you enter your Rage using a Bonus Action, you can move up to half your Speed as part of that same Bonus Action."
  },
  {
    "name": "Brutal Strike",
    "icon": "",
    "cat": "attack",
    "uses": "While Raging",
    "minLevel": 9,
    "damageFormula": "1d10",
    "damageButtonLabel": "+1d10",
    "desc": "When you use Reckless Attack and have advantage, forgo the advantage on one attack to deal +1d10 damage and trigger a Brutal Strike effect: Forceful Blow (push 15 ft or knock Prone) or Hamstring Blow (target's Speed halved until start of your next turn)."
  },
  {
    "name": "Improved Brutal Strike",
    "icon": "",
    "cat": "attack",
    "uses": "While Raging",
    "minLevel": 13,
    "damageFormula": "1d10",
    "damageButtonLabel": "+1d10",
    "desc": "Brutal Strike gains two new effects: Staggering Blow (target has Disadvantage on the next attack roll it makes before the start of your next turn) and Sundering Blow (another creature within 5 ft of the target takes 1d10 Force damage, no attack roll). Still forgo Reckless Attack advantage on one attack."
  },
  {
    "name": "Brutal Strike (lv17 upgrade)",
    "icon": "",
    "cat": "attack",
    "uses": "While Raging",
    "minLevel": 17,
    "damageFormula": "2d10",
    "damageButtonLabel": "+2d10",
    "desc": "Brutal Strike extra damage increases to 2d10 (from 1d10). You can also apply TWO Brutal Strike effects to the same attack instead of one."
  },
  {
    "name": "Relentless Rage",
    "icon": "",
    "cat": "reaction",
    "uses": "DC 10+ CON",
    "minLevel": 11,
    "desc": "When you are reduced to 0 HP while Raging and don't die outright, you can make a DC 10 CON save. On a success, your HP instead changes to a number equal to twice your Barbarian level. Each time you use this feature the DC increases by 5, resetting on a Long Rest."
  },
  {
    "name": "Persistent Rage",
    "icon": "",
    "cat": "action",
    "uses": "Passive",
    "passive": true,
    "minLevel": 15,
    "desc": "When you roll Initiative, you can regain all expended uses of Rage (usable once per Long Rest). Your Rage lasts 10 minutes and ends early only if you have the Unconscious condition, don Heavy Armor, or choose to end it."
  },
  {
    "name": "Indomitable Might",
    "icon": "",
    "cat": "action",
    "uses": "Passive",
    "passive": true,
    "minLevel": 18,
    "desc": "If your total for a STR check is lower than your STR score, use your STR score in its place."
  },
  {
    "name": "Primal Champion",
    "icon": "",
    "cat": "action",
    "uses": "Passive",
    "passive": true,
    "minLevel": 20,
    "desc": "Your STR score increases by 4 and your CON score increases by 4, to a maximum of 25."
  }
]);
registerClassSheetResources("Barbarian", [
  {
    "key": "rage",
    "name": "Rage",
    "icon": "angry",
    "recharge": "LR",
    "max": (lv)=>lv>=20?Infinity:lv>=17?6:lv>=12?5:lv>=6?4:lv>=3?3:2,
    "srRecover": 1
  }
]);
// [SheetRuntime] END

}

