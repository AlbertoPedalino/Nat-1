import { createAdapterBindings } from '../../adapterBindings.js';

export default function install(registry, context = {}) {
  const {
    registerSubclassAdapter,
    registerSubclassSheetActions,
    registerSubclassSheetResources,
    registerSubclassSheetEffects,
    registerWeaponAbilityOverride,
    registerSubclassSheetProficiencies,
  } = createAdapterBindings(registry, context);
function _wizardBladesingerAdapter(cls, lv, specs) {
  if (lv >= 3) {
    specs.push({
      key: "subclass_bladesinger_training_skill",
      label: "Training in War and Song - Skill",
      type: "skill_choice",
      from: ["Acrobatics", "Athletics", "Performance", "Persuasion"],
      count: 1,
      level: 3
    });
  }
}
registerSubclassAdapter("Wizard_Bladesinger", _wizardBladesingerAdapter);
registerSubclassAdapter("Wizard_Bladesinging", _wizardBladesingerAdapter);

const _wizardBladesingerActions = [
  {
    "name": "Bladesong",
    "icon": "",
    "cat": "bonus",
    "uses": "INT mod / LR",
    "resKey": "bladesong",
    "_toggleKey": "bladesong",
    "_toggleCondition": function (ctx) {
      var C = ctx && ctx.C;
      var hasArmorOrShield = (C && C.inventory || []).some(function (i) {
        return i.equipped && ['LA','MA','HA','S'].indexOf(String(i.type || '').toUpperCase()) !== -1;
      });
      return { canActivate: !hasArmorOrShield, isSuppressed: hasArmorOrShield };
    },
    "minLevel": 3
  },
  {
    "name": "Song of Defense",
    "icon": "",
    "cat": "reaction",
    "uses": "Reaction + Spell Slot",
    "minLevel": 10
  },
  {
    "name": "Song of Victory",
    "icon": "",
    "cat": "bonus",
    "uses": "After action spell",
    "minLevel": 14
  }
];
const _wizardBladesingerResources = [
  {
    "key": "bladesong",
    "name": "Bladesong",
    "icon": "music",
    "recharge": "LR",
    "max": "abilityMod:int", "minMax": 1
  }
];
const _wizardBladesingerProficiencies = [
  {
    type: "weapon",
    values: ["Melee Martial weapons without Heavy or Two-Handed property"],
    match: { type: "M", category: "martial", excludeProperties: ["H", "2H"] },
    display: true,
    minLevel: 3
  }
];
registerSubclassSheetActions("Wizard_Bladesinger", _wizardBladesingerActions);
registerSubclassSheetActions("Wizard_Bladesinging", _wizardBladesingerActions);
registerSubclassSheetResources("Wizard_Bladesinger", _wizardBladesingerResources);
registerSubclassSheetResources("Wizard_Bladesinging", _wizardBladesingerResources);
registerSubclassSheetProficiencies("Wizard_Bladesinger", _wizardBladesingerProficiencies);
registerSubclassSheetProficiencies("Wizard_Bladesinging", _wizardBladesingerProficiencies);
registerWeaponAbilityOverride({
  key: "bladesong_int_weapon",
  label: "Bladesong",
  ability: "int",
  weaponTypes: ["M"],
  grantsProficiency: false,
  requiresProficiency: true,
  condition: function (C) {
    if (!C || C.bladesongActive !== true) return false;
    return C.subclassShortName === "Bladesinger" || C.subclassShortName === "Bladesinging" ||
      (C.extraClasses || []).some(function (ec) {
        return ec.subclassShortName === "Bladesinger" || ec.subclassShortName === "Bladesinging";
      });
  }
});

function bladesingerConditionActive(C) {
  if (!C) return false;
  return C.bladesongActive === true;
}

registerSubclassSheetEffects("Wizard_Bladesinger", [
  {
    type: "acBonus",
    ability: "int",
    minLevel: 3,
    note: "Bladesong",
    condition: bladesingerConditionActive,
  },
  {
    type: "speed",
    value: 10,
    minLevel: 3,
    note: "Bladesong",
    condition: bladesingerConditionActive,
  },
  {
    type: "advantage",
    target: "skill",
    skill: "Acrobatics",
    minLevel: 3,
    note: "Bladesong",
    condition: bladesingerConditionActive,
  },
  {
    type: "concentrationBonus",
    ability: "int",
    minLevel: 3,
    note: "Bladesong",
    condition: bladesingerConditionActive,
  },
  { type: "extraAttackCantripReplacement", minLevel: 6, note: "Extra Attack." },
  { type: "damageReduction", minLevel: 10, note: "Song of Defense." },
]);

}
