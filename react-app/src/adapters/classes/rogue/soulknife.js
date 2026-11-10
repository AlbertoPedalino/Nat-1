import { createAdapterBindings } from '../../adapterBindings.js';
import { levelTable, PSIONIC_DICE_COUNT } from '../../classAdapterHelpers.js';

export default function install(registry, context = {}) {
  const {
    registerSubclassAdapter,
    registerSubclassSheetActions,
    registerSubclassSheetResources,
    registerSubclassSheetEffects,
  } = createAdapterBindings(registry, context);
registerSubclassAdapter("Rogue_Soulknife", function (cls, lv, specs) {});

registerSubclassSheetActions("Rogue_Soulknife", [
  {
    "name": "Psychic Blades",
    "icon": "",
    "cat": "attack",
    "uses": "Unlimited",
    "minLevel": 3,
    rollers: [{ kind: 'damage', formula: "1d6", label: ({ formula }) => `${formula} psychic` }],
    "rollLabelPrefix": "Psychic Blades"
  },
  {
    "name": "Psi-Bolstered Knack",
    "icon": "",
    "cat": "reaction",
    "uses": "1 Psionic Die",
    "resKey": "psionic_dice",
    "minLevel": 3
  },
  {
    "name": "Psychic Whispers",
    "icon": "",
    "cat": "action",
    "uses": "1 Psionic Die",
    "resKey": "psionic_dice",
    "minLevel": 3
  },
  {
    "name": "Homing Strikes",
    "icon": "",
    "cat": "attack",
    "uses": "1 Psionic Die",
    "resKey": "psionic_dice",
    "minLevel": 9
  },
  {
    "name": "Psychic Teleportation",
    "icon": "",
    "cat": "bonus",
    "uses": "1 Psionic Die",
    "resKey": "psionic_dice",
    "minLevel": 9
  },
  {
    "name": "Psychic Veil",
    "icon": "",
    "cat": "action",
    "uses": "1 / LR",
    "resKey": "psychic_veil",
    "minLevel": 13
  },
  {
    "name": "Rend Mind",
    "icon": "",
    "cat": "attack",
    "uses": "1 / LR",
    "resKey": "rend_mind",
    "minLevel": 17
  }
]);
registerSubclassSheetResources("Rogue_Soulknife", [
  {
    "key": "psionic_dice",
    "name": "Psionic Energy Dice",
    "icon": "brain",
    "recharge": "LR",
    "max": (lv) => levelTable(lv, PSIONIC_DICE_COUNT),
    "pool": true,
    "track": "used"
  },
  {
    "key": "psychic_veil",
    "name": "Psychic Veil",
    "icon": "eye-off",
    "recharge": "LR",
    "max": () => 1
  },
  {
    "key": "rend_mind",
    "name": "Rend Mind",
    "icon": "brain",
    "recharge": "LR",
    "max": () => 1
  }
]);

registerSubclassSheetEffects("Rogue_Soulknife", [

  { type: "psychicWeapon", minLevel: 3, note: "Psychic Blades: finesse, thrown, psychic damage." },
  { type: "telepathy", minLevel: 3, note: "Psychic Whispers." },
  { type: "teleport", minLevel: 9, note: "Psychic Teleportation." },
  { type: "invisibility", minLevel: 13, note: "Psychic Veil." },
  { type: "stun", minLevel: 17, note: "Rend Mind." },
]);

}

