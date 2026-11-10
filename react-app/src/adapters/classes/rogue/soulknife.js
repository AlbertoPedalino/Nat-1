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
    
    "cat": "attack",
    
    "minLevel": 3,
    rollers: [{ kind: 'damage', formula: "1d6", label: ({ formula }) => `${formula} psychic` }],
    "rollLabelPrefix": "Psychic Blades"
  },
  {
    "name": "Psi-Bolstered Knack",
    
    "cat": "reaction",
    
    "resKey": "psionic_dice",
    "minLevel": 3
  },
  {
    "name": "Psychic Whispers",
    
    "cat": "action",
    
    "resKey": "psionic_dice",
    "minLevel": 3
  },
  {
    "name": "Homing Strikes",
    
    "cat": "attack",
    
    "resKey": "psionic_dice",
    "minLevel": 9
  },
  {
    "name": "Psychic Teleportation",
    
    "cat": "bonus",
    
    "resKey": "psionic_dice",
    "minLevel": 9
  },
  {
    "name": "Psychic Veil",
    
    "cat": "action",
    
    "resKey": "psychic_veil",
    "minLevel": 13
  },
  {
    "name": "Rend Mind",
    
    "cat": "attack",
    
    "resKey": "rend_mind",
    "minLevel": 17
  }
]);
registerSubclassSheetResources("Rogue_Soulknife", [
  {
    "key": "psionic_dice",
    "name": "Psionic Energy Dice",
    
    "recharge": "LR",
    "max": (lv) => levelTable(lv, PSIONIC_DICE_COUNT),
    "pool": true,
    "track": "used"
  },
  {
    "key": "psychic_veil",
    "name": "Psychic Veil",
    
    "recharge": "LR",
    "max": () => 1
  },
  {
    "key": "rend_mind",
    "name": "Rend Mind",
    
    "recharge": "LR",
    "max": () => 1
  }
]);

registerSubclassSheetEffects("Rogue_Soulknife", [

  { type: "telepathy", minLevel: 3, note: "Psychic Whispers." },
  { type: "teleport", minLevel: 9, note: "Psychic Teleportation." },
]);

}

