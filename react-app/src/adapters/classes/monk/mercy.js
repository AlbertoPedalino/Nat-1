import { createAdapterBindings } from '../../adapterBindings.js';

export default function install(registry, context = {}) {
  const {
    registerSubclassAdapter,
    registerSubclassSheetActions,
    registerSubclassSheetResources,
    registerSubclassSheetEffects,
    registerSubclassSheetProficiencies,
  } = createAdapterBindings(registry, context);
registerSubclassAdapter("Monk_Mercy", function (cls, lv, specs) {});

registerSubclassSheetActions("Monk_Mercy", [
  { name: "Hand of Harm", icon: "", cat: "attack", uses: "1 Focus Point / turn", resKey: "ki", minLevel: 3,
    rollers: [{ kind: 'damage', formula: ({ ownerLevel }) => {
      const lv = Number(ownerLevel || 1);
      const die = lv >= 17 ? 12 : lv >= 11 ? 10 : lv >= 5 ? 8 : 6;
      return `1d${die}+WIS`;
    }, label: ({ formula }) => `+${formula} necrotic` }] },
  { name: "Hand of Healing", icon: "", cat: "action", uses: "1 Focus Point", resKey: "ki", minLevel: 3 },
  { name: "Flurry of Healing and Harm", icon: "", cat: "bonus", uses: "WIS mod / LR", resKey: "mercy_flurry", minLevel: 11 },
  { name: "Hand of Ultimate Mercy", icon: "", cat: "action", uses: "1 / LR", resKey: "mercy_ultimate", minLevel: 17 },
]);
registerSubclassSheetResources("Monk_Mercy", [
  { key: "mercy_flurry", name: "Flurry of Healing and Harm", icon: "sparkles", recharge: "LR",
    max: (lv, { wis } = {}) => Math.max(1, wis ?? 0) },
  { key: "mercy_ultimate", name: "Hand of Ultimate Mercy", icon: "heart", recharge: "LR", max: () => 1 },
]);
registerSubclassSheetProficiencies("Monk_Mercy", [
  { type: "skill",  values: ["Insight", "Medicine"], minLevel: 3 },
  { type: "tool",   values: ["Herbalism Kit"],        minLevel: 3 },
]);

registerSubclassSheetEffects("Monk_Mercy", [

  { type: "healing", minLevel: 3, note: "Hand of Healing." },
  { type: "necroticDamage", minLevel: 3, note: "Hand of Harm." },
  { type: "conditionRemoval", conditions: ["Blinded", "Deafened", "Paralyzed", "Poisoned", "Stunned"], minLevel: 6, note: "Physician's Touch." },
  { type: "revive", minLevel: 17, note: "Hand of Ultimate Mercy." },
]);

}

