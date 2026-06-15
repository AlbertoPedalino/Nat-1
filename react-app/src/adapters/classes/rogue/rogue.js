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
    getWeaponMasteryChoiceCount,
    getWeaponMasteryChoiceNames,
    WEAPON_MASTERY_RULES,
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
registerClassAdapter("Rogue", function (cls, lv, specs, ctx = {}) {
  const expertiseFrom = typeof SKILLS !== 'undefined'
    ? SKILLS.map(function (s) { return s.n; }).concat(["Thieves' Tools"])
    : ["Thieves' Tools"];
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

// [SheetRuntime] START
registerClassSheetActions("Rogue", [
  {
    "name": "Sneak Attack",
    "icon": "",
    "cat": "attack",
    "uses": "1 / turn",
    "rollFormula": ({ ownerLevel }) => {
      const lv = Number(ownerLevel || 1);
      const dice = Math.max(1, Math.ceil(lv / 2));
      return `${dice}d6`;
    },
    "rollButtonLabel": ({ formula }) => `${String(formula || '')} extra`,
    "rollLabelPrefix": "Damage",
    "desc": "Once per turn, deal extra damage with a Finesse or ranged weapon if you have Advantage on the attack OR a conscious ally is within 5 ft of the target (you must not have Disadvantage). Dice: 1d6 at lv.1, +1d6 every 2 levels."
  },
  {
    "name": "Cunning Action",
    "icon": "",
    "cat": "bonus",
    "uses": "Unlimited",
    "minLevel": 2,
    "desc": "Bonus Action each turn: take the Dash, Disengage, or Hide action."
  },
  {
    "name": "Steady Aim",
    "icon": "",
    "cat": "bonus",
    "uses": "Unlimited",
    "minLevel": 3,
    "desc": "Bonus Action: give yourself Advantage on your next attack roll this turn. You must not have moved during this turn, and your speed becomes 0 until the end of the turn."
  },
  {
    "name": "Uncanny Dodge",
    "icon": "",
    "cat": "reaction",
    "uses": "Reaction",
    "minLevel": 5,
    "desc": "When an attacker you can see hits you with an attack roll, use your Reaction to halve the attack's damage against you."
  },
  {
    "name": "Cunning Strike",
    "icon": "",
    "cat": "attack",
    "uses": "Sneak Attack die",
    "minLevel": 5,
    "desc": "When you deal Sneak Attack damage, forgo one or more Sneak Attack dice to apply an option: Disarm (1 die, DEX save or drops item), Poison (1 die, CON save or Poisoned 1 min), Trip (1 die, DEX save or Prone), Withdraw (1 die, movement doesn't provoke OA this turn)."
  },
  {
    "name": "Improved Cunning Strike",
    "icon": "",
    "cat": "attack",
    "uses": "Sneak Attack dice",
    "minLevel": 11,
    "desc": "You can use up to two Cunning Strike options when you deal Sneak Attack damage, instead of only one."
  },
  {
    "name": "Devious Strikes",
    "icon": "",
    "cat": "attack",
    "uses": "Sneak Attack dice",
    "minLevel": 14,
    "desc": "Additional Cunning Strike options: Daze (2 dice, CON save or Incapacitated until end of your next turn), Knock Out (6 dice, CON save or Unconscious for 1 min — ends if target takes damage or is shaken), Obscure (3 dice, DEX save or Blinded until end of your next turn)."
  },
  {
    "name": "Evasion",
    "icon": "",
    "cat": "reaction",
    "uses": "Passive",
    "passive": true,
    "minLevel": 7,
    "desc": "DEX save: take no damage on success, half on failure. Doesn't work if Incapacitated."
  },
  {
    "name": "Reliable Talent",
    "icon": "",
    "cat": "action",
    "uses": "Passive",
    "passive": true,
    "minLevel": 7,
    "desc": "When you make an ability check using a skill you are proficient in, treat a d20 roll of 9 or lower as a 10."
  },
  {
    "name": "Slippery Mind",
    "icon": "",
    "cat": "action",
    "uses": "Passive",
    "passive": true,
    "minLevel": 15,
    "desc": "Proficiency in WIS and CHA saving throws."
  },
  {
    "name": "Elusive",
    "icon": "",
    "cat": "action",
    "uses": "Passive",
    "passive": true,
    "minLevel": 18,
    "desc": "No attack roll has Advantage against you while you are not Incapacitated."
  },
  {
    "name": "Stroke of Luck",
    "icon": "",
    "cat": "action",
    "uses": "1 / LR",
    "resKey": "stroke_of_luck",
    "minLevel": 20,
    "desc": "Once per Long Rest: turn a failed ability check into a success, or turn a miss into a hit. Recharge: Long Rest."
  }
]);
registerClassSheetResources("Rogue", [
  {
    "key": "stroke_of_luck",
    "name": "Stroke of Luck",
    "icon": "star",
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
// [SheetRuntime] END

}
