import { createAdapterBindings } from '../../adapterBindings.js';
import { levelTable, PSIONIC_DIE, PSIONIC_DICE_COUNT } from '../../classAdapterHelpers.js';
import { finalAbilityModifier } from '../../../shared/character/progression/abilityScores.js';
import { withModifier } from '../../../shared/ui/numberFormat.js';

export default function install(registry, context = {}) {
  const {
    registerSubclassAdapter,
    registerSubclassSheetActions,
    registerSubclassSheetResources,
    registerSubclassSheetEffects,
    registerSubclassRuntimeConfig,
  } = createAdapterBindings(registry, context);
registerSubclassAdapter("Fighter_Psi Warrior", function (cls, lv, specs) {});

registerSubclassSheetActions("Fighter_Psi Warrior", [
  { name: "Protective Field", cat: "reaction", resKey: "psi_dice", minLevel: 3 },
  { name: "Psionic Strike", cat: "attack", resKey: "psi_dice", minLevel: 3,
    rollers: [{ kind: 'damage', formula: ({ character, ownerLevel }) => (
      withModifier(`1d${levelTable(ownerLevel, PSIONIC_DIE)}`, finalAbilityModifier(character, 'int'))
    ), label: ({ formula }) => `+${formula} force` }] },
  { name: "Telekinetic Movement", cat: "action", resKey: "telekinetic_movement", minLevel: 3 },
  { name: "Psi-Powered Leap", cat: "bonus", resKey: "psi_leap", minLevel: 7 },
  { name: "Guarded Mind", cat: "action", resKey: "psi_dice", minLevel: 10 },
  { name: "Bulwark of Force", cat: "bonus", resKey: "bulwark_force", minLevel: 15 },
  { name: "Telekinetic Master", cat: "action", resKey: "telekinetic_master", minLevel: 18 },
]);
registerSubclassSheetResources("Fighter_Psi Warrior", [
  { key: "psi_dice", name: "Psionic Energy Dice", recharge: "LR",
    max: (lv) => levelTable(lv, PSIONIC_DICE_COUNT),
    pool: true, track: "used" },
  { key: "telekinetic_movement", name: "Telekinetic Movement", recharge: "SR", max: () => 1 },
  { key: "psi_leap",             name: "Psi-Powered Leap",     recharge: "SR", max: () => 1 },
  { key: "bulwark_force",        name: "Bulwark of Force",     recharge: "LR", max: () => 1 },
  { key: "telekinetic_master",   name: "Telekinetic Master",   recharge: "LR", max: () => 1 },
]);
registerSubclassRuntimeConfig("Fighter_Psi Warrior", {
  spellcasting: {
    ability: "int",
    alwaysPreparedSpells: [
      { name: "Telekinesis", minLevel: 18, level: 5 },
    ],
  },
});

registerSubclassSheetEffects("Fighter_Psi Warrior", [

  { type: "conditionRemoval", conditions: ["Charmed", "Frightened"], minLevel: 10, note: "Guarded Mind." },
  { type: "resistance", damageTypes: ["Psychic"], minLevel: 10, note: "Guarded Mind." },
]);

}

