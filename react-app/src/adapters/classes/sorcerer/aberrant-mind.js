import { createAdapterBindings } from '../../adapterBindings.js';

export default function install(registry, context = {}) {
  const {
    registerSubclassAdapter,
    registerSubclassSheetActions,
    registerSubclassSheetResources,
    registerSubclassSheetEffects,
  } = createAdapterBindings(registry, context);
registerSubclassAdapter("Sorcerer_Aberrant Mind", function (cls, lv, specs) {});

registerSubclassSheetActions("Sorcerer_Aberrant Mind", [
  {
    "name": "Telepathic Speech",
    "cat": "bonus",
    "minLevel": 3
  },
  {
    "name": "Psionic Sorcery",
    "cat": "bonus",
    "resKey": "sorc_pts",
    "minLevel": 6
  },
  {
    "name": "Revelation in Flesh",
    "cat": "bonus",
    "resKey": "sorc_pts",
    "minLevel": 14
  },
  {
    "name": "Warping Implosion",
    "cat": "action",
    "resKey": "aberrant_implosion",
    "minLevel": 18,
    rollers: [{ kind: 'damage', formula: "3d10", label: ({ formula }) => `${formula} force` }]
  }
]);
registerSubclassSheetResources("Sorcerer_Aberrant Mind", [
  {
    "key": "aberrant_implosion",
    "name": "Warping Implosion",
    "recharge": "LR",
    "max": () => 1
  }
]);

registerSubclassSheetEffects("Sorcerer_Aberrant Mind", [

  { type: "telepathy", minLevel: 3, note: "Telepathic Speech: bonus action, range CHA modifier miles, duration Sorcerer level minutes." },
  { type: "resistance", damageTypes: ["Psychic"], minLevel: 6, note: "Psychic Defenses." },
  { type: "advantage", target: "save", conditions: ["Charmed", "Frightened"], minLevel: 6, note: "Psychic Defenses." },

]);

}

