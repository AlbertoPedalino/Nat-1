import { createAdapterBindings } from '../../adapterBindings.js';
import { SKILL_NAMES } from '../../../shared/content/rulesVocabulary.js';
import { RAGE_DAMAGE_LEVELS, rageDamageBonus } from './rageDamage.js';

export default function install(registry, context = {}) {
  const {
    allItemsDb,
    getWeaponMasteryChoiceCount,
    getWeaponMasteryChoiceNames,
    WEAPON_MASTERY_RULES,
    registerClassAdapter,
    registerClassSheetActions,
    registerClassSheetResources,
    registerClassSheetEffects,
  } = createAdapterBindings(registry, context);
registerClassAdapter("Barbarian", function (cls, lv, specs, ctx = {}) {
  if (lv >= 1) {
    const weapons = getWeaponMasteryChoiceNames(ctx.items, allItemsDb, WEAPON_MASTERY_RULES.barbarian);
    specs.push({
      key: 'barbarian_weapon_mastery',
      label: 'Weapon Mastery (Barbarian)',
      type: 'generic_choice',
      from: weapons,
      count: getWeaponMasteryChoiceCount('barbarian', lv),
      level: 1
    });
  }
  if (lv >= 3) {
    const allSkills = SKILL_NAMES;
    specs.push({
      key: 'barbarian_primal_knowledge',
      feature: 'Primal Knowledge',
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
  { type: "speed", value: 10, minLevel: 5, requiredArmor: { heavy: false }, note: "Fast Movement" },
  { type: "abilityScore", abilities: ["str", "con"], value: 4, max: 25, minLevel: 20, note: "Primal Champion" },
  // Feral Instinct: Advantage on Initiative rolls.
  { type: "advantage", target: "initiative", minLevel: 7, note: "Feral Instinct." },
  // Rage Damage, one tier per step of the Rage table (rageDamage.js).
  ...RAGE_DAMAGE_LEVELS.map((minLevel) => (
    { type: "meleeDamageBonus", ability: "str", value: rageDamageBonus(minLevel), minLevel, note: "Rage", condition: _barbarianRaging }
  )),
]);

registerClassSheetActions("Barbarian", [
  {
    "name": "Rage",
    "cat": "bonus",
    "resKey": "rage",
    "_toggleKey": "rage",
    "_toggleCondition": function (ctx) {
      var C = ctx && ctx.C;
      var hasHeavyArmor = (C && C.inventory || []).some(function (i) {
        return i.equipped && String(i.type || '').toUpperCase() === 'HA';
      });
      return { canActivate: !hasHeavyArmor, isSuppressed: hasHeavyArmor };
    }
  },
  {
    "name": "Reckless Attack",
    "cat": "attack",
    "minLevel": 2
  },
  {
    "name": "Brutal Strike",
    "cat": "attack",
    "minLevel": 9,
    rollers: [{ kind: 'damage', formula: "1d10", label: "+1d10" }]
  },
  {
    "name": "Improved Brutal Strike",
    "cat": "attack",
    "minLevel": 13,
    rollers: [{ kind: 'damage', formula: "1d10", label: "+1d10" }]
  },
  {
    "name": "Brutal Strike (lv17 upgrade)",
    "cat": "attack",
    "minLevel": 17,
    rollers: [{ kind: 'damage', formula: "2d10", label: "+2d10" }]
  },
  {
    "name": "Relentless Rage",
    "cat": "reaction",
    "minLevel": 11
  }
]);
registerClassSheetResources("Barbarian", [
  {
    "key": "rage",
    "name": "Rage",
    "recharge": "LR",
    "max": (lv)=>lv>=20?Infinity:lv>=17?6:lv>=12?5:lv>=6?4:lv>=3?3:2,
    "srRecover": 1
  }
]);

}
