import { createAdapterBindings } from '../../adapterBindings.js';

// Wild Magic Sorcery: one card per feature, each with its text from the
// subclass data (found by name, like every card). Controlled Chaos (14) is
// the surge roll's second die; its text stays in the Features tab.
export default function install(registry, context = {}) {
  const {
    registerSubclassAdapter,
    registerSubclassSheetActions,
    registerSubclassSheetResources,
  } = createAdapterBindings(registry, context);

registerSubclassAdapter("Sorcerer_Wild Magic", function (cls, lv, specs) {});

registerSubclassSheetActions("Sorcerer_Wild Magic", [
  {
    name: "Wild Magic Surge",
    cat: "special",
    minLevel: 3,
    detailType: "rollTable",
    rollTable: { key: "wildMagicSurge", twice: { fromLevel: 14, feature: "Controlled Chaos" } },
  },
  {
    name: "Tides of Chaos",
    cat: "special",
    resKey: "wild_tides",
    minLevel: 3,
  },
  {
    name: "Bend Luck",
    cat: "reaction",
    resKey: "sorc_pts",
    minLevel: 6,
  },
  {
    name: "Tamed Surge",
    cat: "special",
    resKey: "wild_tamed",
    minLevel: 18,
  },
]);
registerSubclassSheetResources("Sorcerer_Wild Magic", [
  // Also back after casting a Sorcerer spell with a slot (the surge it brings).
  { key: "wild_tides", name: "Tides of Chaos", recharge: "LR", minLevel: 3, max: () => 1 },
  { key: "wild_tamed", name: "Tamed Surge", recharge: "LR", minLevel: 18, max: () => 1 },
]);

}
